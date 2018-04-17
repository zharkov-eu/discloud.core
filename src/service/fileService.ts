"use strict";

import config from "../../config";
import {mkDirRecursive} from "../lib/mkdir";

const DEFAULT_PATH = "data";

class FileService {
  private rootPath: string;

  constructor() {
    this.rootPath = config.data && config.data.path ? config.data.path : DEFAULT_PATH;
  }

  public init = async (): Promise<void> => {
    await mkDirRecursive(this.rootPath);
  }
}

export default FileService;
