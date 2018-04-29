"use strict";

import * as restify from "restify";
import {logger, LogType} from "./src/logger";
import {MasterRouter} from "./src/masterRouter";
import NodeWorker from "./src/nodeWorker";
import CassandraRepository from "./src/repository/cassandra";
import RegistryService from "./src/service/registryService";
import {SlaveRouter} from "./src/slaveRouter";

export async function App(node: NodeWorker, registryService: RegistryService) {
  const server = restify.createServer({
    name: "discloud:" + node.getNodeInfo().uid,
    version: "1.0.0",
  });

  server.acceptable = ["application/json", "application/octet-stream"];

  server.use(restify.plugins.acceptParser(server.acceptable));
  server.use(restify.plugins.queryParser());
  server.use(restify.plugins.bodyParser());

  process.on("uncaughtException", (error) => {
    logger.error({type: LogType.SYSTEM, error: JSON.stringify(error)}, "uncaughtException");
  });

  process.on("unhandledRejection", (error) => {
    logger.error({type: LogType.SYSTEM, error: JSON.stringify(error)}, "unhandledRejection");
  });

  async function slaveServer() {
    SlaveRouter(server, {node, registryService});

    server.listen(8000, () => {
      logger.info({type: LogType.SYSTEM}, `${server.name} listen on port ${server.url}`);
    });
  }

  async function masterServer() {
    const repository = new CassandraRepository();
    MasterRouter(server, {node, registryService, repository});

    server.listen(8000, () => {
      logger.info({type: LogType.SYSTEM}, `${server.name} listen on port ${server.url}`);
    });
  }

  node.getNodeInfo().role === "master" ? await masterServer() : await slaveServer();
}
