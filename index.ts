"use strict";

import * as fs from "fs";
import * as path from "path";
import {RedisClient} from "redis";
import {promisify} from "util";
import {App} from "./app";
import config from "./config";
import INodeConfig from "./src/interface/nodeConfig";
import NodeConfig from "./src/lib/nodeConfig";
import {logger} from "./src/logger";
import NodeWorker from "./src/nodeWorker";

const statAsync = promisify(fs.stat);
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
const loadConfig = () => new Promise<INodeConfig | undefined>(resolve => {
  statAsync(CONFIG_PATH)
      .then(
          () => readFileAsync(CONFIG_PATH, "utf8"),
          () => Promise.resolve(),
      )
      .then((configFile: string) => configFile ? resolve(new NodeConfig(configFile)) : resolve())
      .catch((error) => {
        logger.error(error);
        process.exit(1);
      });
});

client.on("connect", async () => {
  const nodeConfig = await loadConfig() || {};
  const node = new NodeWorker(client, {ipv4: nodeConfig.bindIp, uid: nodeConfig.uid});
  const uid = await node.register();
  await writeFileAsync(CONFIG_PATH, JSON.stringify({...nodeConfig, uid}));
  logger.info("NodeWorker started, uid: " + uid);

  await App(node, node.getRegistryService());
});
