"use strict";

import {RedisClient} from "redis";
import {NotFoundError} from "restify-errors";
import {v4} from "uuid";
import {IEntryRequest} from "../controller/request/entryRequest";
import {NodeUnavailableError, ParentPathNotExists} from "../error";
import IEntry, {EntryType} from "../interface/entry";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import LruCache from "../lib/lruCache";
import CassandraRepository from "../repository/cassandra";
import GroupService from "./groupService";
import PubService from "./pubService";
import RegistryService from "./registryService";
import UserService from "./userService";

export default class EntryService {
  public static DELIMITER = ":::";

  public static extendLocation = (location: string): {uid: string, status: LocationStatus} => {
    const splitLocation = location.split(EntryService.DELIMITER);
    return {uid: splitLocation[0], status: splitLocation[1] as any};
  };

  private static convertRow(row: { [key: string]: any }): IEntry {
    return {
      child: row.child,
      created: row.created,
      filetype: row.filetype,
      group: row.group,
      lastModify: row.last_modify,
      location: row.location,
      locationPath: row.locationPath,
      name: row.name,
      owner: row.owner,
      parent: row.parent,
      path: row.path,
      permission: row.permission,
      share: row.share,
      type: row.type,
      uuid: row.uuid,
    };
  }

  private readonly node: INode;
  private readonly repository: CassandraRepository;
  private readonly redisClient: RedisClient;
  private readonly registryService: RegistryService;
  private readonly groupService: GroupService;
  private readonly userService: UserService;
  private readonly uuidLruCache: LruCache<IEntry>;
  private readonly pathLruCache: LruCache<IEntry>;
  private readonly pubEntryService: PubService<IPubEntry>;

  constructor(node: INode, repository: CassandraRepository, redisClient: RedisClient,
              registryService: RegistryService, groupService: GroupService, userService: UserService) {
    this.node = node;
    this.repository = repository;
    this.redisClient = redisClient;
    this.registryService = registryService;
    this.userService = userService;
    this.groupService = groupService;
    this.uuidLruCache = new LruCache<IEntry>(100);
    this.pathLruCache = new LruCache<IEntry>(100);
    this.pubEntryService = new PubService<IPubEntry>(redisClient, "entry:global");
  }

  public getAll = async (id: number): Promise<IEntry[]> => {
    const query = `SELECT * FROM entry_${id};`;
    const result = await this.repository.client.execute(query, [], {prepare: true});
    if (result.rowLength === 0) {
      return [];
    }
    return result.rows.map(row => EntryService.convertRow(row));
  };

  public getByUUID = async (id: number, uuid: string): Promise<IEntry> => {
    const query = `SELECT * FROM entry_${id} WHERE uuid = ?;`;
    const result = await this.repository.client.execute(query, [uuid], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return EntryService.convertRow(result.first());
  };

  public getByPath = async (id: number, path: string): Promise<IEntry> => {
    const query = `SELECT * FROM entry_${id} WHERE path = ?;`;
    const result = await this.repository.client.execute(query, [path], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return EntryService.convertRow(result.first());
  };

  public save = async (id: number, entryRequest: IEntryRequest) => {
    const nodesAvailable = await this.checkNodesAvailable(entryRequest.location);
    const nodesUnavailable = Array.from(nodesAvailable.entries())
        .map(it => ({uid: it[0], alive: it[1]}))
        .filter(node => !node.alive);
    if (nodesUnavailable.length !== 0) {
      throw new NodeUnavailableError("Nodes " + nodesUnavailable.map(node => node.uid).join(",") + " is unavailable");
    }

    const locationSet = Array.from(nodesAvailable.entries())
        .map(it => {
          return it[0] === this.node.uid
              ? it[0] + EntryService.DELIMITER + LocationStatus.CREATED
              : it[0] + EntryService.DELIMITER + LocationStatus.RESERVED;
        });

    const user = this.userService.findById(entryRequest.owner);
    if (!user) throw new NotFoundError("Owner: user {%s} not found", entryRequest.owner);

    const group = this.groupService.findById(entryRequest.group);
    if (!group) throw new NotFoundError("Group: group {%s} not found", entryRequest.group);

    const parentPathExists = await this.checkParentPath(id, entryRequest.path);
    if (!parentPathExists) throw new ParentPathNotExists("Entry: parent path not exist");

    const locationPath = [id, entryRequest.path, entryRequest.name].join("/").replace(/\/+/g, "/");

    const timestamp = new Date().getTime();
    const entry: IEntry = {
      child: entryRequest.type === EntryType.DIRECTORY ? [] : null,
      created: timestamp,
      filetype: entryRequest.type === EntryType.FILE ? entryRequest.filetype : null,
      group: entryRequest.group,
      lastModify: timestamp,
      location: locationSet,
      locationPath,
      name: entryRequest.name,
      owner: entryRequest.owner,
      parent: entryRequest.parent,
      path: entryRequest.path,
      permission: entryRequest.permission,
      share: entryRequest.share,
      type: entryRequest.type,
      uuid: v4(),
    };
    const query = `INSERT INTO entry_${id} (
        uuid, name, type, filetype, parent, child, path, owner, group, permission, share, created, last_modify, size,
        location, location_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
    await this.repository.client.execute(query,
        [entry.uuid, entry.name, entry.type, entry.filetype, entry.parent, entry.child, entry.path,
          entry.owner, entry.group, entry.permission, entry.share, entry.created, entry.lastModify, entry.size,
          entry.location, entry.locationPath],
        {prepare: true},
    );

    this.pubEntryService.publish({
      location_path: entry.locationPath, location_set: locationSet, owner: entry.owner, uuid: entry.uuid,
    });

    return entry;
  };

  public deleteByUuid = async (id: number, uuid: string): Promise<void> => {
    const query = `DELETE FROM entry_${id} WHERE uuid = ?;`;
    await this.repository.client.execute(query, [uuid], {prepare: true});
  };

  public deleteByPath = async (id: number, path: string): Promise<void> => {
    const query = `DELETE FROM entry_${id} WHERE path = ?;`;
    await this.repository.client.execute(query, [path], {prepare: true});
  };

  private checkNodesAvailable = async (uids: string[]): Promise<Map<string, boolean>> => {
    const nodeMap = new Map<string, boolean>();
    uids.forEach(uid => nodeMap.set(uid, false));

    const nodes = await this.registryService.getAllNodes();
    nodes.forEach(node => nodeMap.has(node.uid) ? nodeMap.set(node.uid, true) : undefined);
    return nodeMap;
  };

  private checkParentPath = async (id: number, path: string): Promise<boolean> => {
    const splitPath = path.split("/");
    if (splitPath.length <= 2) return true;
    const query = `SELECT * FROM entry_${id} WHERE path = ?;`;
    const resultSet = await this.repository.client.execute(query, [splitPath.slice(-2, -1)], {prepare: true});
    return resultSet.first() !== undefined;
  };
}
