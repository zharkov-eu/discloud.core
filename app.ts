"use strict";

import * as restify from "restify";
import INodeConfig from "./src/interface/nodeConfig";
import {logger, LogType} from "./src/logger";
import {MasterRouter} from "./src/masterRouter";
import {NodeRouter} from "./src/nodeRouter";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";
import FileService from "./src/service/fileService";
import RegistryService from "./src/service/registryService";

interface IAppOptions {
  fileService: FileService;
  registryService: RegistryService;
}

export class App {
  private readonly node: NodeWorker;
  private readonly fileService: FileService;
  private readonly registryService: RegistryService;
  private readonly repository: CassandraRepository;
  private readonly server: restify.Server;

  constructor(node: NodeWorker, repository: CassandraRepository, options: IAppOptions) {
    this.node = node;
    this.fileService = options.fileService;
    this.registryService = options.registryService;
    this.repository = repository;
    this.server = restify.createServer({
      name: "discloud:" + node.getNodeInfo().uid,
      version: "1.0.0",
    });
  }

  public startServer = async (config: INodeConfig = {}) => {
    const port = config.port || 8000;

    this.server.acceptable = ["application/json", "application/octet-stream"];

    this.server.use(restify.plugins.acceptParser(this.server.acceptable));
    this.server.use(restify.plugins.queryParser());
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
    MasterRouter(this.server, {node: this.node, repository: this.repository});
    logger.info({type: LogType.SYSTEM}, `${this.server.name} server start master job`);
  }
}
