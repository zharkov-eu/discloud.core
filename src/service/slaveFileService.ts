"use strict";

import LocationStatus from "../interface/locationStatus";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import IPubFile from "../interface/pubFile";
import {logger} from "../logger";
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
    const service = file.location_set
        .map(location => AbstractEntryService.extendLocation(location))
        .filter(node => this.node.uid === node.uid)[0];
    if (service !== undefined) {
      logger.info(file);
    }
  };

  public unsubscribeListener = () => {
    this.subEntryService.unsubscribe();
    this.subFileService.unsubscribe();
  };
}
