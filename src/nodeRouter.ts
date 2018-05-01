"use strict";

import * as restify from "restify";
import FileController from "./controller/fileController";
import NodeController from "./controller/nodeController";
import NodeWorker from "./nodeWorker";
import FileService from "./service/fileService";
import RegistryService from "./service/registryService";

interface IRouterOptions {
  node: NodeWorker;
  fileService: FileService;
  registryService: RegistryService;
}

export function NodeRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const nodeController = new NodeController(options.node, options.registryService);
  const fileController = new FileController(options.fileService);

  server.get("/node/global", nodeController.getAllGlobal);
  server.get("/node/local", nodeController.getAll);
  server.get("/node/current", nodeController.get);

  server.post("/upload/:id", fileController.post);
}
