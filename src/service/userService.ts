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
      password: row.password,
      salt: row.salt,
      username: row.username,
    };
  }

  private readonly repository: CassandraRepository;

  constructor(repository: CassandraRepository) {
    this.repository = repository;
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
    const user: IUser = {
      group: Array.isArray(userRequest.group) ? userRequest.group : [],
      password: hashedPassword,
      salt,
      username: userRequest.username,
    };
    const query = "INSERT INTO user (username, group, password, salt) VALUES (?,?,?,?);";
    await this.repository.client.execute(query,
        [user.username, user.group, user.password, user.salt],
        {prepare: true},
    );
    return user;
  }
}
