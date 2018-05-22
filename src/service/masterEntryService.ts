"use strict";

import * as path from "path";
import {RedisClient} from "redis";
import {NotFoundError} from "restify-errors";
import {v4} from "uuid";
import {IEntryRequest} from "../controller/request/entryRequest";
import {NodeUnavailableError, ParentPathNotExists} from "../error";
import IEntry, {EntryType} from "../interface/entry";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";
import GroupService from "./groupService";
import PubService from "./pubService";
import RegistryService from "./registryService";
import UserService from "./userService";

export default class MasterEntryService extends AbstractEntryService {
  private readonly node: INode;
  private readonly redisClient: RedisClient;
  private readonly registryService: RegistryService;
  private readonly groupService: GroupService;
  private readonly userService: UserService;
  private readonly pubEntryService: PubService<IPubEntry>;

  constructor(node: INode, repository: CassandraRepository, redisClient: RedisClient,
              registryService: RegistryService, groupService: GroupService, userService: UserService) {
    super(repository);
    this.node = node;
    this.redisClient = redisClient;
    this.registryService = registryService;
    this.userService = userService;
    this.groupService = groupService;
    this.pubEntryService = new PubService<IPubEntry>(redisClient, "entry:global");
  }

  public save = async (id: number, entryRequest: IEntryRequest) => {
    const user = await this.userService.findById(entryRequest.owner);
    if (!user) throw new NotFoundError("Owner: user {%s} not found", entryRequest.owner);

    const group = await this.groupService.findById(entryRequest.group);
    if (!group) throw new NotFoundError("Group: group {%s} not found", entryRequest.group);

    const nodesAvailable = await this.checkNodesAvailable(entryRequest.location);
    const nodesUnavailable = Array.from(nodesAvailable.entries())
        .map(it => ({uid: it[0], alive: it[1]}))
        .filter(node => !node.alive);
    if (nodesUnavailable.length !== 0) {
      throw new NodeUnavailableError("Nodes " + nodesUnavailable.map(node => node.uid).join(",") + " is unavailable");
    }

    const locationSet = Array.from(nodesAvailable.entries())
        .map(it => {
          if (entryRequest.type === EntryType.DIRECTORY) {
            return it[0] + AbstractEntryService.DELIMITER + LocationStatus.EXISTS;
          } else {
            return it[0] === this.node.uid
                ? it[0] + AbstractEntryService.DELIMITER + LocationStatus.RESERVED
                : it[0] + AbstractEntryService.DELIMITER + LocationStatus.CREATED;
          }
        });

    const parentUuid = await this.getParentUuid(id, entryRequest.path);
    if (!parentUuid) throw new ParentPathNotExists("Entry: parent path not exist");

    const locationPath = [id, entryRequest.path].join("/").replace(/\/+/g, "/");

    const timestamp = new Date().getTime();
    const entry: IEntry = {
      child: entryRequest.type === EntryType.DIRECTORY ? [] : null,
      created: timestamp,
      filetype: entryRequest.type === EntryType.FILE ? entryRequest.filetype : null,
      group: entryRequest.group,
      lastModify: timestamp,
      location: locationSet,
      locationPath,
      owner: entryRequest.owner,
      parent: parentUuid,
      path: entryRequest.path,
      permission: entryRequest.permission,
      share: entryRequest.share,
      type: entryRequest.type,
      uuid: v4(),
    };
    const query = `INSERT INTO entry_${id} (
        uuid, type, filetype, parent, child, path, owner, group, permission, share, created, last_modify, size,
        location, location_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
    await this.repository.client.execute(query,
        [entry.uuid, entry.type, entry.filetype, entry.parent, entry.child, entry.path,
          entry.owner, entry.group, entry.permission, entry.share, entry.created, entry.lastModify, entry.size,
          entry.location, entry.locationPath],
        {prepare: true},
    );
    const parentUpdateQuery = `UPDATE entry_${entry.owner} SET child = child + ? WHERE uuid = ?;`;
    await this.repository.client.execute(parentUpdateQuery, [[entry.uuid], parentUuid], {prepare: true});

    if (entry.type === EntryType.FILE) {
      this.pubEntryService.publish({
        location: locationSet, locationPath: entry.locationPath, owner: entry.owner, uuid: entry.uuid,
      });
    }

    return entry;
  };

  public deleteByUuid = async (id: number, uuid: string): Promise<void> => {
    const query = `DELETE FROM entry_${id} WHERE uuid = ?;`;
    await this.repository.client.execute(query, [uuid], {prepare: true});
  };

  public deleteByPath = async (id: number, pathName: string): Promise<void> => {
    const query = `DELETE FROM entry_${id} WHERE path = ?;`;
    await this.repository.client.execute(query, [pathName], {prepare: true});
  };

  private checkNodesAvailable = async (uids: string[]): Promise<Map<string, boolean>> => {
    const nodeMap = new Map<string, boolean>();
    uids.forEach(uid => nodeMap.set(uid, false));

    const nodes = await this.registryService.getAllNodes();
    nodes.forEach(node => nodeMap.has(node.uid) ? nodeMap.set(node.uid, true) : undefined);
    return nodeMap;
  };

  private getParentUuid = async (id: number, pathName: string): Promise<string> => {
    const dirname = path.dirname(pathName) === "." ? "/" : path.dirname(pathName);
    const query = `SELECT * FROM entry_${id} WHERE path = ?;`;
    const resultSet = await this.repository.client.execute(query, [dirname], {prepare: true});
    if (!resultSet.first()) return undefined;
    else return AbstractEntryService.convertRow(resultSet.first()).uuid;
  };
}
