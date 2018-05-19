"use strict";

import * as fs from "fs";
import * as path from "path";
import * as restify from "restify";
import {promisify} from "util";
import config from "../../config";
import IPubEntry from "../interface/pubEntry";
import {mkDirRecursive} from "../lib/mkdir";
import {logger} from "../logger";
import SubService from "./subService";

const statAsync = promisify(fs.stat);
const renameAsync = promisify(fs.rename);

const DEFAULT_PATH = path.join("data");

class FileService {
  private readonly rootPath: string;
  private readonly subEntryService: SubService<IPubEntry>;

  constructor() {
    this.rootPath = config.data && config.data.path ? config.data.path : DEFAULT_PATH;
    this.subEntryService = new SubService<IPubEntry>("entry:global", (message: IPubEntry) => {
      logger.info(message);
    });
  }

  public getRootPath = () => this.rootPath;

  public getTempPath = () => [this.rootPath, "tmp"].join(path.sep);

  public init = async () => {
    await this.createDirectory(this.getRootPath());
    await this.createDirectory(this.getTempPath());
  };

  public unsubscribeListener = () => {
    this.subEntryService.unsubscribe();
  };

  public saveFile = async (req: restify.Request, options: { user: string }) => {
    const renameFilePromises = [];
    Object.keys(req.files).forEach(name => {
      const filename = name + "." + req.files[name].path.split(path.sep).slice(-1)[0].split(".").slice(-1)[0];
      renameFilePromises.push(renameAsync(req.files[name].path, path.join(this.rootPath, options.user, filename)));
    });
    await Promise.all(renameFilePromises);
  };

  private createDirectory = (dirPath: string) => new Promise((resolve, reject) => {
    statAsync(dirPath)
        .then(
            (result) => result.isDirectory() ? Promise.resolve() : Promise.reject("RootPath not a directory"),
            () => mkDirRecursive(this.rootPath),
        )
        .then(() => resolve())
        .catch((err) => reject(err));
  })
}

export default FileService;
