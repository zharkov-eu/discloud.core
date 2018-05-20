"use strict";

import {RedisClient} from "redis";
import * as restify from "restify";
import INodeConfig from "./src/interface/nodeConfig";
import {logger, LogType} from "./src/logger";
import {MasterRouter} from "./src/masterRouter";
import uploadMiddleware from "./src/middleware/uploadMiddleware";
import {NodeRouter} from "./src/nodeRouter";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";
import GroupService from "./src/service/groupService";
import MasterFileService from "./src/service/masterFileService";
import RegistryService from "./src/service/registryService";
import SlaveEntryService from "./src/service/slaveEntryService";
import SlaveFileService from "./src/service/slaveFileService";
import UserService from "./src/service/userService";

interface IAppServices {
  groupService: GroupService;
  registryService: RegistryService;
  slaveEntryService: SlaveEntryService;
  slaveFileService: SlaveFileService;
  userService: UserService;
}

interface IAppOptions {
  port?: number;
}

export class App {
  private readonly node: NodeWorker;
  private readonly groupService: GroupService;
  private readonly registryService: RegistryService;
  private readonly repository: CassandraRepository;
  private readonly redisClient: RedisClient;
  private readonly slaveFileService: SlaveFileService;
  private readonly slaveEntryService: SlaveEntryService;
  private readonly userService: UserService;
  private readonly server: restify.Server;

  constructor(node: NodeWorker, repository: CassandraRepository, redisClient: RedisClient, services: IAppServices) {
    this.node = node;
    this.groupService = services.groupService;
    this.registryService = services.registryService;
    this.repository = repository;
    this.redisClient = redisClient;
    this.slaveFileService = services.slaveFileService;
    this.slaveEntryService = services.slaveEntryService;
    this.userService = services.userService;
    this.server = restify.createServer({
      name: "discloud:" + node.getNodeInfo().uid,
      version: "1.0.0",
    });
  }

  public startServer = async (config: INodeConfig = {}, options: IAppOptions = {}) => {
    const port = options.port || config.port || 8000;

    this.server.acceptable = ["application/json", "application/octet-stream"];

    this.server.use(restify.plugins.acceptParser(this.server.acceptable));
    this.server.use(restify.plugins.queryParser());
    this.server.use(uploadMiddleware(this.repository));
    this.server.use(restify.plugins.bodyParser({
      hash: "md5",
      keepExtensions: true,
      uploadDir: this.slaveFileService.getTempPath(),
    }));

    NodeRouter(this.server, {
      node: this.node,
      registryService: this.registryService,
      slaveEntryService: this.slaveEntryService,
      slaveFileService: this.slaveFileService,
      userService: this.userService,
    });

    this.server.listen(port, () => {
      logger.info({type: LogType.SYSTEM}, `${this.server.name} listen on ${this.server.url}`);
    });
  };

  public startMasterJob = (masterFileService: MasterFileService) => {
    MasterRouter(this.server, {
      groupService: this.groupService,
      masterFileService,
      node: this.node,
      redisClient: this.redisClient,
      registryService: this.registryService,
      repository: this.repository,
      userService: this.userService,
    });
    logger.info({type: LogType.SYSTEM}, `${this.server.name} server start master job`);
  }
}
