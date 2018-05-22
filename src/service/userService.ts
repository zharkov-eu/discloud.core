"use strict";

import * as crypto from "crypto";
import {NotFoundError} from "restify-errors";
import {promisify} from "util";
import {v4} from "uuid";
import {IUserRequest} from "../controller/request/userRequest";
import {EntryShare, EntryType} from "../interface/entry";
import IEntry from "../interface/entry";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IUser from "../interface/user";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";
import GroupService from "./groupService";

const randomBytesAsync = promisify(crypto.randomBytes);

export default class UserService {
  private static convertRow(row: { [key: string]: any }): IUser {
    return {
      group: row.group,
      id: row.id,
      password: row.password,
      salt: row.salt,
      username: row.username,
    };
  }

  private readonly node: INode;
  private readonly repository: CassandraRepository;
  private readonly groupService: GroupService;

  constructor(node: INode, repository: CassandraRepository, groupService: GroupService) {
    this.node = node;
    this.repository = repository;
    this.groupService = groupService;
  }

  public async findById(id: number): Promise<IUser> {
    const query = "SELECT * FROM user WHERE id=?";
    const result = await this.repository.client.execute(query, [id], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return UserService.convertRow(result.first());
  }

  public async findByUsername(username: string): Promise<IUser> {
    const query = "SELECT * FROM user WHERE username=?";
    const result = await this.repository.client.execute(query, [username], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return UserService.convertRow(result.first());
  }

  public async save(userRequest: IUserRequest) {
    const groups = Array.isArray(userRequest.group) ? userRequest.group : [];
    await this.checkGroupsThrowable(groups);

    await this.repository.client.execute("UPDATE counters SET counter_value = counter_value + 1 WHERE type='user';");
    const idResult = await this.repository.client.execute("SELECT counter_value FROM counters WHERE type='user';");

    const password = await this.createPasswordHash(userRequest.password);

    const user: IUser = {
      group: groups,
      id: idResult.first().counter_value,
      password: password.hashedPassword,
      salt: password.salt,
      username: userRequest.username,
    };

    const query = "INSERT INTO user (id, username, group, password, salt) VALUES (?,?,?,?,?);";
    await this.repository.client.execute(query,
        [user.id, user.username, user.group, user.password, user.salt],
        {prepare: true},
    );

    await this.createEntryTable(user.id);
    await this.createRootPath(user.id);

    return user;
  }

  public async update(id: number, userRequest: IUserRequest): Promise<IUser> {
    let updateKeys = Object.keys(userRequest);
    const updateValues = [];
    for (const key of Object.keys(userRequest)) {
      if (userRequest[key] === undefined) updateKeys = updateKeys.filter((exKey) => exKey !== key);
      else updateValues.push(userRequest[key]);
    }

    if (updateKeys.indexOf("group") !== -1) {
      const pointer = updateKeys.indexOf("group");
      await this.checkGroupsThrowable(updateValues[pointer]);
    }

    if (updateKeys.indexOf("password") !== -1) {
      const pointer = updateKeys.indexOf("password");
      const password = await this.createPasswordHash(updateValues[pointer]);
      updateValues[pointer] = password.hashedPassword;
      updateKeys.push("salt");
      updateValues.push(password.salt);
    }

    const setQuery = updateKeys.map((key) => key + " = ?").join(", ");
    const query = `UPDATE user SET ${setQuery} WHERE id = ?;`;

    await this.repository.client.execute(query,
        [...updateValues, id],
        {prepare: true},
    );

    return this.findById(id);
  }

  public async delete(username: string): Promise<void> {
    const query = "DELETE FROM user WHERE id=?";
    await this.repository.client.execute(query, [username], {prepare: true});
  }

  private createPasswordHash = async (password: string = ""): Promise<{hashedPassword: string, salt: string}> => {
    const salt = (await randomBytesAsync(24)).toString("hex");
    password = password || (await randomBytesAsync(8)).toString("hex");
    const hash = crypto.createHmac("sha512", salt);
    const hashedPassword = hash.update(password).digest().toString("base64");
    return {hashedPassword, salt};
  };

  private checkGroupsThrowable = async (groups: number[]): Promise<void> => {
    const groupsExists = await Promise.all(groups.map(async id => ([id, await this.groupService.findById(id)])));
    const groupsNotExists = groupsExists.filter(it => it[1] === undefined).map(it => it[0]);
    if (groupsNotExists.length) {
      throw new NotFoundError("Groups %s not exists", groupsNotExists.toString());
    }
  };

  private createRootPath = async (id: number): Promise<void> => {
    const locationSet = [this.node.uid].map(it => it + AbstractEntryService.DELIMITER + LocationStatus.EXISTS);
    const timestamp = new Date().getTime();
    const entry: IEntry = {
      child: [],
      created: timestamp,
      filetype: null,
      group: null,
      lastModify: timestamp,
      location: locationSet,
      locationPath: `${id}`,
      owner: id,
      parent: null,
      path: "/",
      permission: "640",
      share: EntryShare.NONE,
      type: EntryType.DIRECTORY,
      uuid: v4(),
    };
    const query = `INSERT INTO entry_${id} (
        uuid, type, filetype, parent, child, path, owner, group, permission, share, created, last_modify, size,
        location, location_path) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);`;
    await this.repository.client.execute(query,
        [entry.uuid, entry.type, entry.filetype, entry.parent, entry.child, entry.path,
          entry.owner, entry.group, entry.permission, entry.share, entry.created, entry.lastModify, entry.size,
          entry.location, entry.locationPath],
        {prepare: true});
  };

  private createEntryTable = async (id: number): Promise<void> => {
    const createTable = `
      CREATE TABLE IF NOT EXISTS discloud.entry_${id} (
          uuid uuid PRIMARY KEY,
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
          size int,
          share text,
          location set<text>,
          location_path text
    );`;
    const indexQueries = [];
    indexQueries.push(`CREATE INDEX IF NOT EXISTS entry_${id}_by_path ON discloud.entry_${id} (path);`);
    indexQueries.push(`CREATE INDEX IF NOT EXISTS entry_${id}_by_path ON discloud.entry_${id} (parent);`);
    await this.repository.client.execute(createTable);
    for (const query of indexQueries) {
      await this.repository.client.execute(query);
    }
  };
}
