"use strict";

import * as restify from "restify";
import INodeConfig from "./src/interface/nodeConfig";
import {logger, LogType} from "./src/logger";
import {MasterRouter} from "./src/masterRouter";
import {NodeRouter} from "./src/nodeRouter";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";
import RegistryService from "./src/service/registryService";

export class App {
  private readonly node: NodeWorker;
  private readonly registryService: RegistryService;
  private readonly server: restify.Server;

  constructor(node: NodeWorker, registryService: RegistryService) {
    this.node = node;
    this.registryService = registryService;
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
    this.server.use(restify.plugins.bodyParser());

    NodeRouter(this.server, {node: this.node, registryService: this.registryService});

    this.server.listen(port, () => {
      logger.info({type: LogType.SYSTEM}, `${this.server.name} listen on ${this.server.url}`);
    });
  };

  public startMasterJob = () => {
    const repository = new CassandraRepository();
    MasterRouter(this.server, {node: this.node, repository});
    logger.info({type: LogType.SYSTEM}, `${this.server.name} server start master job`);
  }
}
