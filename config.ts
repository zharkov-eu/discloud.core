"use strict";

import * as path from "path";

interface IConfig {
  data: {path: string};
  ipv4: string;
  redis: {host: string, port: number};
}

// noinspection TsLint
const config: IConfig = require(path.join(__dirname, "config.json"));

export default config;
