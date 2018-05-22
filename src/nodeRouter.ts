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
import UserService from "./service/userService";

interface IRouterOptions {
  node: NodeWorker;
  registryService: RegistryService;
  slaveFileService: SlaveFileService;
  slaveEntryService: SlaveEntryService;
  userService: UserService;
}

export function NodeRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const addRoute = (method: string, path: string, fun: (req, res, next) => any) => {
    server[method](path, asyncWrapper(fun));
  };

  const nodeController = new NodeController(options.node, options.registryService);
  const fileController = new NodeFileController(options.slaveEntryService, options.registryService);
  const entryController = new NodeEntryController(options.slaveEntryService, options.userService);

  addRoute("get", "/node/global", nodeController.getAllGlobal);
  addRoute("get", "/node/local", nodeController.getAll);
  addRoute("get", "/node/current", nodeController.get);

  addRoute("get", "/file/:userid(\\d+)/uuid/:uuid", fileController.getByUuid);
  addRoute("get", "/file/:userid(\\d+)/path/*", fileController.getByPath);

  addRoute("get", "/entry/:userid(\\d+)/entry", entryController.getEntries);
  addRoute("get", "/entry/:userid(\\d+)/entry/:uuid", entryController.getEntry);
}
