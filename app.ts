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
import FileService from "./src/service/fileService";
import RegistryService from "./src/service/registryService";

interface IAppServices {
  fileService: FileService;
  registryService: RegistryService;
}

interface IAppOptions {
  port?: number;
}

export class App {
  private readonly node: NodeWorker;
  private readonly fileService: FileService;
  private readonly registryService: RegistryService;
  private readonly repository: CassandraRepository;
  private readonly redisClient: RedisClient;
  private readonly server: restify.Server;

  constructor(node: NodeWorker, repository: CassandraRepository, redisClient: RedisClient, services: IAppServices) {
    this.node = node;
    this.fileService = services.fileService;
    this.registryService = services.registryService;
    this.repository = repository;
    this.redisClient = redisClient;
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
      uploadDir: this.fileService.getRootPath(),
    }));

    NodeRouter(this.server, {
      fileService: this.fileService,
      node: this.node,
      registryService: this.registryService,
    });

    this.server.listen(port, () => {
      logger.info({type: LogType.SYSTEM}, `${this.server.name} listen on ${this.server.url}`);
    });
  };

  public startMasterJob = () => {
    MasterRouter(this.server, {
      node: this.node,
      redisClient: this.redisClient,
      registryService: this.registryService,
      repository: this.repository,
    });
    logger.info({type: LogType.SYSTEM}, `${this.server.name} server start master job`);
  }
}
