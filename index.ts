"use strict";

import * as fs from "fs";
import * as path from "path";
import {RedisClient} from "redis";
import {promisify} from "util";
import {App} from "./app";
import config from "./config";
import {NodeRoleEnum} from "./src/interface/node";
import INodeConfig from "./src/interface/nodeConfig";
import {mkDirRecursive} from "./src/lib/mkdir";
import NodeConfig from "./src/lib/nodeConfig";
import {logger, LogType} from "./src/logger";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";
import FileService from "./src/service/fileService";

const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

const client = new RedisClient({
  host: configRedis.host,
  port: configRedis.port,
});

const CONFIG_PATH = path.join(__dirname, "config", "system.json");
const CONFIG_DIRECTORY = CONFIG_PATH.split(path.sep).slice(0, CONFIG_PATH.split(path.sep).length - 1).join(path.sep);

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

/*
 * Переписать UID в конфигурационном файле
 * @return {Promise<INodeConfig>}
 */
const rewriteUID = async (nodeConfig: INodeConfig, uid: string): Promise<INodeConfig> => {
  try {
    const stats = await statAsync(CONFIG_DIRECTORY);
    if (!stats.isDirectory()) {
      throw new Error();
    }
  } catch (e) {
    if (e.code === "ENOENT") {
      await mkDirRecursive(CONFIG_DIRECTORY);
    } else {
      throw e;
    }
  }
  await writeFileAsync(CONFIG_PATH, JSON.stringify({...nodeConfig, uid}));
  return {...nodeConfig, uid};
};

/**
 * Старт модели поведения мастера
 * @param {App} app
 */
const masterBehavior = (app: App): void => {
  app.startMasterJob();
};

client.on("connect", async () => {
  let nodeConfig: INodeConfig = await loadConfig() || {};

  const repository = new CassandraRepository();
  const node = new NodeWorker(client, repository, {
    ipv4: nodeConfig.bindIp,
    uid: nodeConfig.uid,
    zone: nodeConfig.zone,
  });
  const uid = await node.register();
  const fileService = new FileService();
  await fileService.init();
  nodeConfig = await rewriteUID(nodeConfig, uid);

  const app = new App(node, repository, {fileService, registryService: node.getRegistryService()});
  logger.info({type: LogType.SYSTEM}, "NodeWorker started, uid: " + uid);
  await app.startServer(nodeConfig);

  if (node.getNodeInfo().role === NodeRoleEnum.MASTER) {
    masterBehavior(app);
  } else {
    node.masterCb = () => masterBehavior(app);
  }
});

process.on("uncaughtException", (error) => {
  logger.error({type: LogType.SYSTEM, error: JSON.stringify(error)}, "uncaughtException");
});

process.on("unhandledRejection", (error) => {
  logger.error({type: LogType.SYSTEM, error: JSON.stringify(error)}, "unhandledRejection");
});
