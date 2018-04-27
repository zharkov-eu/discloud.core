"use strict";

import * as crypto from "crypto";
import {promisify} from "util";
import {IUserRequest} from "../controller/request/userRequest";
import IUser from "../interface/user";
import CassandraRepository from "../repository/cassandra";

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

  private readonly repository: CassandraRepository;

  constructor(repository: CassandraRepository) {
    this.repository = repository;
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
    const salt = (await randomBytesAsync(24)).toString("hex");
    const password = userRequest.password || (await randomBytesAsync(8)).toString("hex");
    const hash = crypto.createHmac("sha512", salt);
    const hashedPassword = hash.update(password).digest().toString("base64");
    const idQuery = "UPDATE counters SET counter_value = counter_value + 1 WHERE type='user';";
    const idResult = await this.repository.client.execute(idQuery);
    const user: IUser = {
      group: Array.isArray(userRequest.group) ? userRequest.group : [],
      id: idResult.first().counter_value,
      password: hashedPassword,
      salt,
      username: userRequest.username,
    };
    const query = "INSERT INTO user (id, username, group, password, salt) VALUES (?,?,?,?,?);";
    await this.repository.client.execute(query,
        [user.id, user.username, user.group, user.password, user.salt],
        {prepare: true},
    );
    return user;
  }

  public async update(id: number, userRequest: IUserRequest): Promise<void> {
    let updateKeys = Object.keys(userRequest);
    const updateValues = [];
    for (const key of Object.keys(userRequest)) {
      if (["id"].indexOf(key) !== -1 || userRequest[key] === undefined) {
        updateKeys = updateKeys.filter((exKey) => exKey !== key);
      } else {
        updateValues.push(userRequest[key]);
      }
    }
    const setQuery = updateKeys.map((key) => key + " = ?").join(", ");
    const query = `UPDATE user SET ${setQuery} WHERE username = ?;`;
    await this.repository.client.execute(query,
        [...updateValues, id],
        {prepare: true},
    );
  }

  public async delete(username: string): Promise<void> {
    const query = "DELETE FROM user WHERE username=?";
    await this.repository.client.execute(query, [username], {prepare: true});
  }
}
