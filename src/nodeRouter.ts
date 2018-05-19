"use strict";

import * as restify from "restify";
import FileController from "./controller/fileController";
import NodeController from "./controller/nodeController";
import asyncWrapper from "./lib/asyncWrapper";
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

  const addRoute = (method: string, path: string, fun: (req, res, next) => any) => {
    server[method](path, asyncWrapper(fun));
  };

  const nodeController = new NodeController(options.node, options.registryService);
  const fileController = new FileController(options.fileService);

  addRoute("get", "/node/global", nodeController.getAllGlobal);
  addRoute("get", "/node/local", nodeController.getAll);
  addRoute("get", "/node/current", nodeController.get);
}
