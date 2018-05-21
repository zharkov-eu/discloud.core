"use strict";

import * as fs from "fs";
import * as fse from "fs-extra";
import * as http from "http";
import * as path from "path";
import {NotFoundError} from "restify-errors";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import IPubFile from "../interface/pubFile";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";
import AbstractFileService from "./abstractFileService";
import SubService from "./subService";

export default class SlaveFileService extends AbstractFileService {
  private readonly subEntryService: SubService<IPubEntry>;
  private readonly subFileService: SubService<IPubFile>;

  constructor(node: INode, repository: CassandraRepository) {
    super(node, repository);
    this.subEntryService = new SubService<IPubEntry>("entry:global", (message: IPubEntry) => {
      this.entryListener(message);
    });
    this.subFileService = new SubService<IPubFile>("file:global", (message: IPubFile) => {
      this.fileListener(message);
    });
  }

  public entryListener = async (entry: IPubEntry): Promise<void> => {
    await this.updateLocationStatus(entry, LocationStatus.CREATED, LocationStatus.RESERVED);
  };

  public fileListener = async (file: IPubFile): Promise<void> => {
    const service = file.location
        .map(location => AbstractEntryService.extendLocation(location))
        .filter(node => this.node.uid === node.uid)[0];
    if (service !== undefined) {
      const resultSet = await this.repository.client.execute(
          `SELECT * FROM entry_${file.userId} WHERE uuid = ?`, [file.uuid], {prepare: true});
      if (!resultSet.first()) {
        throw new NotFoundError("Entry by uuid + '{" + file.uuid + "}' not found");
      }
      const entry = AbstractEntryService.convertRow(resultSet.first());
      const locationPath = entry.locationPath.split("/");
      const locationDirectory = entry.locationPath.split("/").slice(0, locationPath.length - 1);

      await fse.ensureDir(path.join(this.rootPath, ...locationDirectory));

      const writeStream = fs.createWriteStream(path.join(this.rootPath, ...locationPath));
      http.get({
        host: file.origin.host || file.origin.ipv4,
        path: `/upload/${entry.owner}/${entry.uuid}`,
        port: file.origin.port,
        protocol: file.origin.protocol,
      }, (res) => {
        res.pipe(writeStream);
      });
    }
  };

  public unsubscribeListener = () => {
    this.subEntryService.unsubscribe();
    this.subFileService.unsubscribe();
  };
}
