"use strict";

import * as restify from "restify";
import {BadRequestError, ConflictError, NotFoundError} from "restify-errors";
import UserService from "../service/userService";
import UserRequest from "./request/userRequest";
import UserResponse from "./request/userResponse";

export default class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public get = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const user = await this.userService.findById(req.params.id);
    if (!user) {
      return next(new NotFoundError("User by id {'%s'} not found", req.params.id));
    }

    return res.json(200, new UserResponse(user));
  };

  public post = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const userRequest = new UserRequest(req.body, {username: "required"});
    if (userRequest["__validationError"] && userRequest["__validationError"]()) {
      return next(new BadRequestError(userRequest["__validationError"]()));
    }

    const existingUser = await this.userService.findByUsername(userRequest.username);
    if (existingUser) {
      return next(new ConflictError("User '%s' already exist", existingUser.username));
    }

    const user = await this.userService.save(userRequest);

    return res.json(201, new UserResponse(user), {location: `/user/${user.id}`});
  };

  public patch = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const userRequest = new UserRequest(req.body);
    if (userRequest["__validationError"] && userRequest["__validationError"]()) {
      return next(new BadRequestError(userRequest["__validationError"]()));
    }

    const user = await this.userService.findById(req.params.id);
    if (!user) {
      return next(new NotFoundError("User by id {'%s'} not found", req.params.id));
    }

    await this.userService.update(req.params.id, {...userRequest, id: undefined});

    return res.json(200, new UserResponse(user));
  };

  public del = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const user = await this.userService.findById(req.params.id);
    if (!user) {
      return next(new NotFoundError("User by id {'%s'} not found", req.params.id));
    }

    await this.userService.delete(req.params.id);
    return res.send(204);
  };
}
