"use strict";

import * as crypto from "crypto";
import {promisify} from "util";
import {v4} from "uuid";
import {IUserRequest} from "../controller/request/userRequest";
import IUser from "../interface/user";
import CassandraRepository from "../repository/cassandra";

const randomBytesAsync = promisify(crypto.randomBytes);

export default class UserService {
    private readonly repository: CassandraRepository;

    constructor(repository: CassandraRepository) {
        this.repository = repository;
    }

    public async save(userRequest: IUserRequest) {
        const salt = (await randomBytesAsync(48)).toString("hex");
        const hash = crypto.createHmac("sha512", salt);
        const password = hash.update(userRequest.password).digest().toString("base64");
        const user: IUser = {
            group: Array.isArray(userRequest.group) ? userRequest.group : [],
            password,
            salt,
            username: userRequest.username,
            uuid: v4(),
        };
        return user;
    }
}
