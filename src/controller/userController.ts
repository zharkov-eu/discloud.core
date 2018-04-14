"use strict";

import * as restify from "restify";
import {BadRequestError, ConflictError, NotFoundError} from "restify-errors";
import UserService from "../service/userService";
import UserRequest from "./request/userRequest";
import {IUserResponse} from "./request/userResponse";

export default class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public get = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const user = await this.userService.findByUsername(req.params.username);
    if (!user) {
      return next(new NotFoundError("User '%s' not found", req.params.username));
    }

    const userResponse: IUserResponse = {
      group: user.group,
      username: user.username,
    };
    return res.send(200, userResponse);
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
    const userResponse: IUserResponse = {
      group: user.group,
      username: user.username,
    };
    return res.json(201, userResponse, {location: `/user/${user.username}`});
  };

  public patch = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const userRequest = new UserRequest(req.body);
    if (userRequest["__validationError"] && userRequest["__validationError"]()) {
      return next(new BadRequestError(userRequest["__validationError"]()));
    }

    const user = await this.userService.findByUsername(userRequest.username);
    if (!user) {
      return next(new NotFoundError("User '%s' not found", req.params.username));
    }

    await this.userService.update(userRequest.username, {...userRequest, username: undefined});
    const userResponse: IUserResponse = {
      group: userRequest.group || user.group,
      username: user.username,
    };
    return res.json(200, userResponse);
  };

  public del = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const user = await this.userService.findByUsername(req.params.username);
    if (!user) {
      return next(new NotFoundError("User '%s' not found", req.params.username));
    }

    await this.userService.delete(req.params.username);
    return res.send(204);
  };
}
