"use strict";

import {RedisClient} from "redis";
import * as restify from "restify";
import CassandraRepository from "./repository/cassandra";

import GroupService from "./service/groupService";
import MasterEntryService from "./service/masterEntryService";
import MasterFileService from "./service/masterFileService";
import RegistryService from "./service/registryService";
import UserService from "./service/userService";

import GroupController from "./controller/groupController";
import MasterEntryController from "./controller/masterEntryController";
import MasterFileController from "./controller/masterFileController";
import UserController from "./controller/userController";
import INode from "./interface/node";
import asyncWrapper from "./lib/asyncWrapper";

interface IRouterOptions {
  groupService: GroupService;
  node: INode;
  repository: CassandraRepository;
  redisClient: RedisClient;
  registryService: RegistryService;
  masterFileService: MasterFileService;
  userService: UserService;
}

export function MasterRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const entryService = new MasterEntryService(options.node, options.repository, options.redisClient,
      options.registryService, options.groupService, options.userService);

  const entryController = new MasterEntryController(entryService, options.userService);
  const fileController = new MasterFileController(options.node, entryService, options.masterFileService);
  const groupController = new GroupController(options.groupService);
  const userController = new UserController(options.userService);

  const addRoute = (method: string, path: string, fun: (req, res, next) => any) => {
    server[method](path, asyncWrapper(fun));
  };

  addRoute("post", "/entry/:userid(\\d+)/", entryController.post);

  addRoute("patch", "/entry/:userid(\\d+)/entry/:entryuid", entryController.patchEntry);
  addRoute("del", "/entry/:userid(\\d+)/entry/:entryuid", entryController.delEntry);

  addRoute("patch", "/entry/:userid(\\d+)/path/:path", entryController.patchPath);
  addRoute("del", "/entry/:userid(\\d+)/path/:path", entryController.delPath);

  addRoute("get", "/group", groupController.getAll);
  addRoute("post", "/group", groupController.post);
  addRoute("get", "/group/:id(\\d+)", groupController.get);
  addRoute("patch", "/group/:id(\\d+)", groupController.patch);
  addRoute("del", "/group/:id(\\d+)", groupController.del);

  addRoute("post", "/user", userController.post);
  addRoute("get", "/user/:id(\\d+)", userController.get);
  addRoute("patch", "/user/:id(\\d+)", userController.patch);
  addRoute("del", "/user/:id(\\d+)", userController.del);

  addRoute("get", "/upload/:userid(\\d+)/:entryuid", fileController.getByUuidMaster);
  addRoute("post", "/upload/:userid(\\d+)/:entryuid", fileController.post);
}
