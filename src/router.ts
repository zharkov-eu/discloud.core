"use strict";

import * as restify from "restify";
import CassandraRepository from "./repository/cassandra";

import GroupService from "./service/groupService";
import UserService from "./service/userService";

import GroupController from "./controller/groupController";
import UserController from "./controller/userController";

export default function Router(server: restify.Server, repository: CassandraRepository) {
  const groupService = new GroupService(repository);
  const userService = new UserService(repository);

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
