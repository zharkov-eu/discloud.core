"use strict";

import * as path from "path";

interface IConfig {
  data: {path: string};
  backend: {
    auth: {location: string, password: string, username: string},
  };
  cassandra: {contactPoints: string[], keyspace: string};
  redis: {host: string, port: number};
}

// noinspection TsLint
const config: IConfig = require(path.join(__dirname, "config.json"));

export default config;
