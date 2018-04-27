"use strict";

import * as fs from "fs";
import * as path from "path";
import {RedisClient} from "redis";
import {promisify} from "util";
import config from "./config";
import INodeConfig from "./src/interface/nodeConfig";
import NodeConfig from "./src/lib/nodeConfig";
import {logger} from "./src/logger";
import Node from "./src/node";

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

const client = new RedisClient({
  host: configRedis.host,
  port: configRedis.port,
});

const CONFIG_PATH = path.join(__dirname, "config", "system.json");

/*
 * Загрузка начальной конфигурации ноды
 * @return {Promise<INodeConfig>}
 */
async function loadConfig(): Promise<INodeConfig | undefined> {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      return new NodeConfig(await readFileAsync(CONFIG_PATH, "utf8"));
    } catch (e) {
      logger.error(e);
      process.exit(1);
    }
  }
}

client.on("connect", async () => {
  const nodeConfig = await loadConfig() || {};
  const node = new Node(client, {ipv4: nodeConfig.bindIp, uid: nodeConfig.uid});
  const uid = await node.register();
  await writeFileAsync(CONFIG_PATH, JSON.stringify({...nodeConfig, uid}));
  logger.info("Node started, uid: " + uid);
});
