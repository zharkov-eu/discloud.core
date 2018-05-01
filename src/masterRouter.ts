"use strict";

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

interface IRouterOptions {
  node: NodeWorker;
  repository: CassandraRepository;
  registryService: RegistryService;
}

export function MasterRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const entryService = new EntryService(options.repository, options.registryService);
  const groupService = new GroupService(options.repository);
  const userService = new UserService(options.repository);

  const entryController = new EntryController(entryService);
  const groupController = new GroupController(groupService);
  const userController = new UserController(userService);

  server.post("/entry/:userid/", entryController.post);

  server.get("/entry/:userid/entry", entryController.getEntries);
  server.get("/entry/:userid/entry/:entryuid", entryController.getEntry);
  server.patch("/entry/:userid/entry/:entryuid", entryController.patchEntry);
  server.del("/entry/:userid/entry/:entryuid", entryController.delEntry);

  server.get("/entry/:userid/path", entryController.getPaths);
  server.get("/entry/:userid/path/:path", entryController.getPath);
  server.patch("/entry/:userid/path/:path", entryController.patchPath);
  server.del("/entry/:userid/path/:path", entryController.delPath);

  server.get("/group", groupController.getAll);
  server.post("/group", groupController.post);
  server.get("/group/:id", groupController.get);
  server.patch("/group/:id", groupController.patch);
  server.del("/group/:id", groupController.del);

  server.post("/user", userController.post);
  server.get("/user/:id", userController.get);
  server.patch("/user/:id", userController.patch);
  server.del("/user/:id", userController.del);
}
