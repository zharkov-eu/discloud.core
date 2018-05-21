"use strict";

import * as fse from "fs-extra";
import * as path from "path";
import config from "../../config";
import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";

const DEFAULT_PATH = path.join("data");

export default abstract class AbstractFileService {
  protected readonly node: INode;
  protected readonly rootPath: string;
  protected readonly repository: CassandraRepository;

  protected constructor(node: INode, repository: CassandraRepository) {
    this.node = node;
    this.repository = repository;
    this.rootPath = config.data && config.data.path ? config.data.path : DEFAULT_PATH;
  }

  public getRootPath = () => this.rootPath;

  public getTempPath = () => [this.rootPath, "tmp"].join(path.sep);

  public init = async () => {
    await fse.ensureDir(this.getRootPath());
    await fse.ensureDir(this.getTempPath());
  };

  protected updateLocationStatus = async (entry: IPubEntry, prevStatus: LocationStatus, nextStatus: LocationStatus) => {
    const location = entry.location
        .map(it => AbstractEntryService.extendLocation(it))
        .filter(it => this.node.uid === it.uid)[0];
    if (location !== undefined && location.status === prevStatus) {
      const locationString = AbstractEntryService.stringifyLocation(location);
      const locationUpdatedString = AbstractEntryService.stringifyLocation({...location, status: nextStatus});
      const locationRemoveQuery = {
        params: [[locationString], entry.uuid],
        query: `UPDATE entry_${entry.owner} SET location = location - ? WHERE uuid = ?;`,
      };
      const locationAddQuery = {
        params: [[locationUpdatedString], entry.uuid],
        query: `UPDATE entry_${entry.owner} SET location = location + ? WHERE uuid = ?;`,
      };
      // TODO: разобраться с ситуацией проверки host сразу после удаления, но до вставки
      await this.repository.client.batch([locationAddQuery, locationRemoveQuery], {prepare: true});
    }
  };
}
