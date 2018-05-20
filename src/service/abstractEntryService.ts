"use strict";

import IEntry from "../interface/entry";
import LocationStatus from "../interface/locationStatus";
import LruCache from "../lib/lruCache";
import CassandraRepository from "../repository/cassandra";

export default abstract class AbstractEntryService {
  public static DELIMITER = ":::";

  public static extendLocation = (location: string): { uid: string, status: LocationStatus } => {
    const splitLocation = location.split(AbstractEntryService.DELIMITER);
    return {uid: splitLocation[0], status: parseInt(splitLocation[1], 10) as LocationStatus};
  };

  public static stringifyLocation = (location: { uid: string, status: LocationStatus }): string => {
    return location.uid + AbstractEntryService.DELIMITER + location.status;
  };

  public static convertRow = (row: { [key: string]: any }): IEntry => ({
    child: row.child,
    created: row.created,
    filetype: row.filetype,
    group: row.group,
    lastModify: row.last_modify,
    location: row.location,
    locationPath: row.location_path,
    name: row.name,
    owner: row.owner,
    parent: row.parent,
    path: row.path,
    permission: row.permission,
    share: row.share,
    type: row.type,
    uuid: row.uuid,
  });

  protected readonly repository: CassandraRepository;
  protected readonly uuidLruCache: LruCache<IEntry>;
  protected readonly pathLruCache: LruCache<IEntry>;

  protected constructor(repository: CassandraRepository) {
    this.repository = repository;
  }

  public getAll = async (id: number): Promise<IEntry[]> => {
    const query = `SELECT * FROM entry_${id};`;
    const result = await this.repository.client.execute(query, [], {prepare: true});
    if (result.rowLength === 0) {
      return [];
    }
    return result.rows.map(row => AbstractEntryService.convertRow(row));
  };

  public getByUUID = async (id: number, uuid: string): Promise<IEntry> => {
    const query = `SELECT * FROM entry_${id} WHERE uuid = ?;`;
    const result = await this.repository.client.execute(query, [uuid], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return AbstractEntryService.convertRow(result.first());
  };

  public getByPath = async (id: number, path: string): Promise<IEntry> => {
    const query = `SELECT * FROM entry_${id} WHERE path = ?;`;
    const result = await this.repository.client.execute(query, [path], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return AbstractEntryService.convertRow(result.first());
  };
}
