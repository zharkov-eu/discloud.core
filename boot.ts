"use strict";

import * as fs from "fs";
import * as fse from "fs-extra";
import * as path from "path";
import {RedisClient} from "redis";
import {promisify} from "util";
import {App} from "./app";
import config from "./config";
import INode, {NodeRoleEnum} from "./src/interface/node";
import INodeConfig from "./src/interface/nodeConfig";
import NodeConfig from "./src/lib/nodeConfig";
import {logger, LogType} from "./src/logger";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";

import MasterFileService from "./src/service/masterFileService";
import SlaveEntryService from "./src/service/slaveEntryService";
import SlaveFileService from "./src/service/slaveFileService";

const statAsync = promisify(fs.stat);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

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
  await fse.ensureDir(CONFIG_DIRECTORY);
  await writeFileAsync(CONFIG_PATH, JSON.stringify({...nodeConfig, uid}));
  return {...nodeConfig, uid};
};

interface IMasterBehaviorOptions {
  redisClient: RedisClient;
  repository: CassandraRepository;
  slaveFileService: SlaveFileService;
}

/**
 * Старт модели поведения мастера
 * @param {INode} node
 * @param {App} app
 * @param options
 */
const masterBehavior = (node: INode, app: App, options: IMasterBehaviorOptions): void => {
  options.slaveFileService.unsubscribeListener();
  const masterFileService = new MasterFileService(node, options.repository, options.redisClient);
  app.startMasterJob(masterFileService);
};

interface IBootOptions {
  port?: number;
  debug?: boolean;
}

export const init = (options: IBootOptions) => {
  const client = new RedisClient({
    host: configRedis.host,
    port: configRedis.port,
  });

  client.on("connect", async () => {
    let nodeConfig: INodeConfig = await loadConfig() || {};

    const repository = new CassandraRepository();

    const node = new NodeWorker(client, repository, {
      ipv4: nodeConfig.bindIp,
      uid: nodeConfig.uid,
      zone: nodeConfig.zone,
    });
    const uid = await node.register();

    const slaveEntryService = new SlaveEntryService(repository);
    const slaveFileService = new SlaveFileService(node.getNodeInfo(), repository);
    await slaveFileService.init();

    nodeConfig = await rewriteUID(nodeConfig, uid);

    const app = new App(node, repository, client, {
      registryService: node.getRegistryService(),
      slaveEntryService,
      slaveFileService,
    });
    logger.info({type: LogType.SYSTEM}, "NodeWorker started, uid: " + uid);
    await app.startServer(nodeConfig, options);

    if (node.getNodeInfo().role === NodeRoleEnum.MASTER) {
      masterBehavior(node.getNodeInfo(), app, {repository, redisClient: client, slaveFileService});
    } else {
      node.masterCb = () => masterBehavior(node.getNodeInfo(), app,
          {repository, redisClient: client, slaveFileService});
    }
  });

  process.on("uncaughtException", (error) => {
    logger.error({type: LogType.SYSTEM, error: error.message}, "uncaughtException");
    if (options.debug) console.error(error.stack);
  });

  process.on("unhandledRejection", (error) => {
    logger.error({type: LogType.SYSTEM, error: error.message}, "unhandledRejection");
    if (options.debug) console.error(error.stack);
  });
};
