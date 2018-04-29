"use strict";

import * as restify from "restify";
import CassandraRepository from "./repository/cassandra";

import NodeWorker from "./nodeWorker";
import GroupService from "./service/groupService";
import UserService from "./service/userService";

import GroupController from "./controller/groupController";
import UserController from "./controller/userController";

interface IRouterOptions {
  node: NodeWorker;
  repository: CassandraRepository;
}

export function MasterRouter(server: restify.Server, options: IRouterOptions) {
  if (!options || typeof options !== "object") {
    throw new Error("MasterRouter options is not a object");
  }

  const groupService = new GroupService(options.repository);
  const userService = new UserService(options.repository);

  const groupController = new GroupController(groupService);
  const userController = new UserController(userService);

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
