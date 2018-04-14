"use strict";

import * as restify from "restify";
import CassandraRepository from "./repository/cassandra";

import UserService from "./service/userService";

import UserController from "./controller/userController";

export default function Router(server: restify.Server, repository: CassandraRepository) {
  const userService = new UserService(repository);
  const userController = new UserController(userService);

  server.post("/user", userController.post);
  server.get("/user/:username", userController.get);
  server.patch("/user/:username", userController.patch);
  server.del("/user/:username", userController.del);
}
