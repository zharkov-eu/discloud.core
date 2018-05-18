"use strict";

import {RedisClient} from "redis";
import {v4} from "uuid";
import {IEntryRequest} from "../controller/request/entryRequest";
import {NodeUnavailableError} from "../error";
import IEntry from "../interface/entry";
import IPubEntry from "../interface/pubEntry";
import LruCache from "../lib/lruCache";
import CassandraRepository from "../repository/cassandra";
import PubService from "./pubService";
import RegistryService from "./registryService";

export default class EntryService {
  private static convertRow(row: { [key: string]: any }): IEntry {
    return {
      child: row.child,
      created: row.created,
      filetype: row.filetype,
      group: row.group,
      last_modify: row.last_modify,
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

  private readonly repository: CassandraRepository;
  private readonly redisClient: RedisClient;
  private readonly registryService: RegistryService;
  private readonly uuidLruCache: LruCache<IEntry>;
  private readonly pathLruCache: LruCache<IEntry>;
  private readonly pubEntryService: PubService<IPubEntry>;

  constructor(repository: CassandraRepository, redisClient: RedisClient, registryService: RegistryService) {
    this.repository = repository;
    this.redisClient = redisClient;
    this.registryService = registryService;
    this.uuidLruCache = new LruCache<IEntry>(100);
    this.pathLruCache = new LruCache<IEntry>(100);
    this.pubEntryService = new PubService<IPubEntry>(redisClient, "entry:global");
  }

  public createEntryTable = async (id: number): Promise<void> => {
    const createTable = `
      CREATE TABLE IF NOT EXISTS discloud.entry_${id} (
          uuid uuid PRIMARY KEY,
          name text,
          type text,
          filetype text,
          parent uuid,
          child set<uuid>,
          path text,
          owner int,
          group int,
          permission text,
          created timestamp,
          last_modify timestamp,
          share text,
          location set<text>,
          location_path text
    );`;
    const createIndex = `CREATE INDEX IF NOT EXISTS entry_${id}_by_path ON discloud.entry_${id} (path);`;
    await this.repository.client.execute(createTable);
    await this.repository.client.execute(createIndex);
  };

  public getAll = async (id: number): Promise<IEntry[]> => {
    const query = `SELECT * FROM entry_${id};`;
    const result = await this.repository.client.execute(query, [], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
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

    const timestamp = new Date().getTime();
    const entry: IEntry = {
      child: [],
      created: timestamp,
      group: entryRequest.group,
      last_modify: timestamp,
      location: entryRequest.location,
      locationPath: "",
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
        uuid, name, type, filetype, parent, child, path, owner, group, permission, share, created, last_modify,
        location, location_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
    await this.repository.client.execute(query,
        [entry.uuid, entry.name, entry.type, entry.filetype, entry.parent, entry.child, entry.path,
          entry.owner, entry.group, entry.permission, entry.share, entry.created, entry.last_modify,
          entry.location, entry.locationPath],
        {prepare: true},
    );

    this.pubEntryService.publish({uuid: entry.uuid, owner: entry.owner, location_set: [], location_path: entry.path});

    return entry;
  };

  public deleteByPath = async (id: number, path: string): Promise<IEntry> => {
    const query = ` * FROM entry_${id} WHERE path = ?;`;
    const result = await this.repository.client.execute(query, [path], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return EntryService.convertRow(result.first());
  };

  private checkNodesAvailable = async (uids: string[]): Promise<Map<string, boolean>> => {
    const nodeMap = new Map<string, boolean>();
    uids.forEach(uid => nodeMap.set(uid, false));

    const nodes = await this.registryService.getAllNodes();
    nodes.forEach(node => nodeMap.has(node.uid) ? nodeMap.set(node.uid, true) : undefined);
    return nodeMap;
  }
}
