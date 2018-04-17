"use strict";

import * as fs from "fs";
import * as path from "path";
import {promisify} from "util";

const mkdirAsync = promisify(fs.mkdir);

export const mkDirRecursive = async (targetDir: string): Promise<void> => {
  const initDir = path.isAbsolute(targetDir) ? path.sep : ".";

  let curDir = path.resolve(initDir);
  for (const dirPath of targetDir.split(path.sep)) {
    curDir = path.resolve(curDir, dirPath);
    await mkdirAsync(curDir);
  }
};
