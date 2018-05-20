"use strict";

import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import {RedisClient} from "redis";
import * as restify from "restify";
import {NotFoundError} from "restify-errors";
import {promisify} from "util";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubFile from "../interface/pubFile";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";
import AbstractFileService from "./abstractFileService";
import PubService from "./pubService";

const renameAsync = promisify(fs.rename);

export default class MasterFileService extends AbstractFileService {
  private readonly pubEntryService: PubService<IPubFile>;

  constructor(node: INode, repository: CassandraRepository, redisClient: RedisClient) {
    super(node, repository);
    this.pubEntryService = new PubService<IPubFile>(redisClient, "file:global");
  }

  public saveFile = async (req: restify.Request, options: { userId: number, entryUuid: string }) => {
    const renameFilePromises = [];
    const resultSet = await this.repository.client.execute(
        `SELECT * FROM entry_${options.userId} WHERE uuid = ?`, [options.entryUuid], {prepare: true});
    if (!resultSet.first()) {
      throw new NotFoundError("Entry by uuid + '{" + options.entryUuid + "}' not found");
    }
    const entry = AbstractEntryService.convertRow(resultSet.first());
    const locationPath = entry.locationPath.split("/");
    const locationDirectory = entry.locationPath.split("/").slice(0, locationPath.length - 1);

    await fse.ensureDir(path.join(this.rootPath, ...locationDirectory));

    Object.keys(req.files).forEach(name => {
      const filename = name + "." + path.extname(req.files[name].path);
      renameFilePromises.push(renameAsync(req.files[name].path, path.join(this.getRootPath(), ...locationPath)));
    });
    await Promise.all(renameFilePromises);

    await this.updateLocationStatus(entry, LocationStatus.RESERVED, LocationStatus.CREATED);
  };
}
