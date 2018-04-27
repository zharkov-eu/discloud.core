"use strict";

import {v4} from "uuid";
import {IEntryRequest} from "../controller/request/entryRequest";
import IEntry from "../interface/entry";
import CassandraRepository from "../repository/cassandra";

export default class EntryService {
  private static convertRow(row: { [key: string]: any }): IEntry {
    return {
      child: row.child,
      created: row.created,
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
      username: row.username,
      uuid: row.uuid,
    };
  }

  private readonly repository: CassandraRepository;

  constructor(repository: CassandraRepository) {
    this.repository = repository;
  }

  public async save(entryRequest: IEntryRequest) {
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
      username: "",
      uuid: v4(),
    };
    const query = "INSERT INTO entry (" +
        "uuid, username, name, type, parent, child, path, owner, group, permission, share, created, last_modify," +
        "location, locationPath) VALUES (?);";
    await this.repository.client.execute(query,
        [entry.uuid],
        {prepare: true},
    );
    return entry;
  }
}
