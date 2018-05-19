"use strict";

import {RedisClient} from "redis";
import * as restify from "restify";
import CassandraRepository from "./repository/cassandra";

import NodeWorker from "./nodeWorker";
import EntryService from "./service/entryService";
import GroupService from "./service/groupService";
import RegistryService from "./service/registryService";
import UserService from "./service/userService";

import EntryController from "./controller/entryController";
import GroupController from "./controller/groupController";
import UserController from "./controller/userController";
import asyncWrapper from "./lib/asyncWrapper";

interface IRouterOptions {
  node: NodeWorker;
  repository: CassandraRepository;
  redisClient: RedisClient;
  registryService: RegistryService;
}

export function MasterRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const groupService = new GroupService(options.repository);
  const userService = new UserService(options.repository, groupService);
  const entryService = new EntryService(options.repository, options.redisClient,
      options.registryService, groupService, userService);

  const entryController = new EntryController(entryService, userService);
  const groupController = new GroupController(groupService);
  const userController = new UserController(userService);

  const addRoute = (method: string, path: string, fun: (req, res, next) => any) => {
    server[method](path, asyncWrapper(fun));
  };

  addRoute("post", "/entry/:userid/", entryController.post);

  addRoute("get", "/entry/:userid/entry", entryController.getEntries);
  addRoute("get", "/entry/:userid/entry/:entryuid", entryController.getEntry);
  addRoute("patch", "/entry/:userid/entry/:entryuid", entryController.patchEntry);
  addRoute("del", "/entry/:userid/entry/:entryuid", entryController.delEntry);

  addRoute("get", "/entry/:userid/path", entryController.getPaths);
  addRoute("get", "/entry/:userid/path/:path", entryController.getPath);
  addRoute("patch", "/entry/:userid/path/:path", entryController.patchPath);
  addRoute("del", "/entry/:userid/path/:path", entryController.delPath);

  addRoute("get", "/group", groupController.getAll);
  addRoute("post", "/group", groupController.post);
  addRoute("get", "/group/:id", groupController.get);
  addRoute("patch", "/group/:id", groupController.patch);
  addRoute("del", "/group/:id", groupController.del);

  addRoute("post", "/user", userController.post);
  addRoute("get", "/user/:id", userController.get);
  addRoute("patch", "/user/:id", userController.patch);
  addRoute("del", "/user/:id", userController.del);
}
