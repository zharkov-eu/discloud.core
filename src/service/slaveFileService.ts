"use strict";

import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import * as request from "request";
import {NotFoundError} from "restify-errors";
import IEntry from "../interface/entry";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import IPubFile, {OperationEnum} from "../interface/pubFile";
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
      switch (file.operation) {
        case OperationEnum.SAVE:
          return this.saveFile(file, entry);
        case OperationEnum.DELETE:
          return this.deleteFile(file, entry);
      }
    }
  };

  public unsubscribeListener = () => {
    this.subEntryService.unsubscribe();
    this.subFileService.unsubscribe();
  };

  private saveFile = async (file: IPubFile, entry: IEntry): Promise<void> => {
    const locationPath = entry.locationPath.split("/");
    const locationDirectory = entry.locationPath.split("/").slice(0, locationPath.length - 1);

    await fse.ensureDir(path.join(this.rootPath, ...locationDirectory));
    await this.writeStream(file.origin, `/upload/${entry.owner}/${entry.uuid}`, locationPath);

    await this.updateLocationStatus(entry, LocationStatus.RESERVED, LocationStatus.EXISTS);
  };

  private deleteFile = async (file: IPubFile, entry: IEntry): Promise<void> => {
    const locationPath = entry.locationPath.split("/");
    await fse.unlink(path.join(this.rootPath, ...locationPath));

    await this.updateLocationStatus(entry, LocationStatus.EXISTS, LocationStatus.DELETED);
  };

  private writeStream = (node: INode, urlPath: string, locationPath: string[]) => new Promise((resolve) => {
    const writeStream = fs.createWriteStream(path.join(this.rootPath, ...locationPath));
    writeStream.on("close", () => {
      resolve();
    });
    request.get({
      followRedirect: true,
      uri: node.protocol + "://" + (node.host || node.ipv4) + ":" + node.port + urlPath,
    }).pipe(writeStream);
  });
}
