"use strict";

import * as fs from "fs";
import * as path from "path";
import {RedisClient} from "redis";
import * as restify from "restify";
import {promisify} from "util";
import config from "../../config";
import IPubEntry from "../interface/pubEntry";
import {mkDirRecursive} from "../lib/mkdir";
import SubService from "./subService";

const statAsync = promisify(fs.stat);
const renameAsync = promisify(fs.rename);

const DEFAULT_PATH = path.join("data");

interface IFileServiceOptions {
  subService?: boolean;
}

class FileService {
  private readonly rootPath: string;
  private readonly subEntryService: SubService<IPubEntry>;

  constructor(redisClient: RedisClient, options: IFileServiceOptions = {}) {
    this.rootPath = config.data && config.data.path ? config.data.path : DEFAULT_PATH;
    if (options.subService) {
      // this.subEntryService = new SubService<IPubEntry>(redisClient, "entry:global", (message: IPubEntry) => {
      //   console.log(message);
      // });
    }
  }

  public getRootPath = () => this.rootPath;

  public init = async () => new Promise((resolve, reject) => {
    statAsync(this.rootPath)
        .then(
            (result) => result.isDirectory() ? Promise.resolve() : Promise.reject("RootPath not a directory"),
            () => mkDirRecursive(this.rootPath),
        )
        .then(() => resolve())
        .catch((err) => reject(err));
  });

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
