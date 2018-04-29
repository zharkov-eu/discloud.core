"use strict";

import * as fs from "fs";
import {dirname} from "path";
import {promisify} from "util";

const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(fs.mkdir);

export const mkDirRecursive = async (directory, mode = 0o777) => {
  try {
    await mkdirAsync(directory, mode);
  } catch (error) {
    switch (error.code) {
      case "ENOENT":
        await mkDirRecursive(dirname(directory), mode);
        await mkDirRecursive(directory, mode);
        break;
      default:
        const stats = await statAsync(directory);
        if (!stats.isDirectory()) {
          throw error;
        }
        break;
    }
  }
};
