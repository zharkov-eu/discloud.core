"use strict";

import * as restify from "restify";

import RegistryService from "./service/registryService";
import SlaveEntryService from "./service/slaveEntryService";
import SlaveFileService from "./service/slaveFileService";

import NodeController from "./controller/nodeController";
import NodeEntryController from "./controller/nodeEntryController";
import NodeFileController from "./controller/nodeFileController";
import asyncWrapper from "./lib/asyncWrapper";
import NodeWorker from "./nodeWorker";

interface IRouterOptions {
  node: NodeWorker;
  registryService: RegistryService;
  slaveFileService: SlaveFileService;
  slaveEntryService: SlaveEntryService;
}

export function NodeRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const addRoute = (method: string, path: string, fun: (req, res, next) => any) => {
    server[method](path, asyncWrapper(fun));
  };

  const nodeController = new NodeController(options.node, options.registryService);
  const fileController = new NodeFileController(options.slaveFileService);
  const entryController = new NodeEntryController(options.slaveEntryService);

  addRoute("get", "/node/global", nodeController.getAllGlobal);
  addRoute("get", "/node/local", nodeController.getAll);
  addRoute("get", "/node/current", nodeController.get);

  addRoute("get", "/file/:userid/*", fileController.get);

  addRoute("get", "/entry/:userid/entry", entryController.getEntries);
  addRoute("get", "/entry/:userid/entry/:entryuid", entryController.getEntry);
}
