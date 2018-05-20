"use strict";

import * as cassandra from "cassandra-driver";
import * as fs from "fs";
import * as path from "path";
import {logger} from "../src/logger";

const client = new cassandra.Client({contactPoints: ["127.0.0.1"]});
const schemaScript = fs.readFileSync(path.join(__dirname, "schema.cql"), "utf8");

(async () => {
  const commands = schemaScript.replace(/([\n\r])/g, "")
      .split(";")
      .filter(it => it.replace(/ /g, "").length !== 0)
      .map(it => it + ";");

  await client.execute(commands.shift()); // Create keyspace commands
  for (const command of commands) {
    await client.execute(command);
  }
})().then(() => {
  logger.info("Schema creation ended successful");
  process.exit(0);
}).catch((error) => {
  logger.error({error: JSON.stringify(error)});
  process.exit(0);
});
