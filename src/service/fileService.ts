"use strict";

import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import {RedisClient} from "redis";
import * as restify from "restify";
import {promisify} from "util";
import config from "../../config";
import INode from "../interface/node";
import IPubEntry from "../interface/pubEntry";
import IPubFile from "../interface/pubFile";
import {logger} from "../logger";
import CassandraRepository from "../repository/cassandra";
import EntryService from "./entryService";
import PubService from "./pubService";
import SubService from "./subService";

const statAsync = promisify(fs.stat);
const renameAsync = promisify(fs.rename);

const DEFAULT_PATH = path.join("data");

class FileService {
  private readonly node: INode;
  private readonly rootPath: string;
  private readonly repository: CassandraRepository;
  private readonly pubEntryService: PubService<IPubFile>;
  private readonly subEntryService: SubService<IPubEntry>;
  private readonly subFileService: SubService<IPubFile>;

  constructor(node: INode, repository: CassandraRepository, redisClient: RedisClient) {
    this.node = node;
    this.repository = repository;
    this.rootPath = config.data && config.data.path ? config.data.path : DEFAULT_PATH;
    this.pubEntryService = new PubService<IPubFile>(redisClient, "file:global");
    this.subEntryService = new SubService<IPubEntry>("entry:global", (message: IPubEntry) => {
      this.entryListener(message);
    });
    this.subFileService = new SubService<IPubFile>("file:global", (message: IPubFile) => {
      this.fileListener(message);
    });
  }

  public getRootPath = () => this.rootPath;

  public getTempPath = () => [this.rootPath, "tmp"].join(path.sep);

  public init = async () => {
    await fse.ensureDir(this.getRootPath());
    await fse.ensureDir(this.getTempPath());
  };

  public entryListener = async (entry: IPubEntry): Promise<void> => {
    const service = entry.location_set
        .map(location => EntryService.extendLocation(location))
        .filter(node => this.node.uid === node.uid)[0];
    if (service !== undefined) {
      const query = `UPDATE entry_${entry.owner} SET location_set = ? WHERE uuid = ?;`;
      logger.info(entry);
    }
  };

  public fileListener = async (file: IPubFile): Promise<void> => {
    const service = file.location_set
        .map(location => EntryService.extendLocation(location))
        .filter(node => this.node.uid === node.uid)[0];
    if (service !== undefined) {
      logger.info(file);
    }
  };

  public unsubscribeListener = () => {
    this.subEntryService.unsubscribe();
    this.subFileService.unsubscribe();
  };

  public saveFile = async (req: restify.Request, options: { user: string }) => {
    const renameFilePromises = [];
    Object.keys(req.files).forEach(name => {
      const filename = name + "." + req.files[name].path.split(path.sep).slice(-1)[0].split(".").slice(-1)[0];
      renameFilePromises.push(renameAsync(req.files[name].path, path.join(this.rootPath, options.user, filename)));
    });
    await Promise.all(renameFilePromises);
  };
}

export default FileService;
