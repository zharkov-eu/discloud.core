"use strict";

import * as cassandra from "cassandra-driver";
import * as fs from "fs";
import * as path from "path";
import {logger} from "../src/logger";

const client = new cassandra.Client({contactPoints: ["127.0.0.1"]});
const schemaScript = fs.readFileSync(path.join(__dirname, "schema.cql"), "utf8");

(async () => {
  const queryPromises = [];
  await client.execute(schemaScript.split(";")[0]);
  schemaScript.split(";").forEach((query) => {
    if (query === "\n") {
      return;
    }
    queryPromises.push(client.execute(query));
  });
  await Promise.all(queryPromises);
})().then(() => {
  logger.info("Schema creation ended successful");
  process.exit(0);
}).catch((error) => {
  logger.error({error: JSON.stringify(error)});
  process.exit(0);
});
