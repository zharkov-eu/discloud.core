"use strict";

import * as restify from "restify";
import NodeController from "./controller/nodeController";
import NodeWorker from "./nodeWorker";
import RegistryService from "./service/registryService";

interface IRouterOptions {
  node: NodeWorker;
  registryService: RegistryService;
}

export function SlaveRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const nodeController = new NodeController(options.node, options.registryService);

  server.get("/node", nodeController.getAll);
  server.get("/current", nodeController.get);
}
