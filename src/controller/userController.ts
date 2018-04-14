"use strict";

import * as restify from "restify";
import {BadRequestError, ConflictError} from "restify-errors";
import UserService from "../service/userService";
import UserRequest from "./request/userRequest";
import {IUserResponse} from "./request/userResponse";

export default class UserController {
  private readonly userService: UserService;

  constructor(userService: UserService) {
    this.userService = userService;
  }

  public get = (req: restify.Request, res: restify.Response) => {
    return res.send(200, {});
  };

  public post = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    // Validate request
    const userRequest = new UserRequest(req.body);
    if (userRequest["__validationError"] && userRequest["__validationError"]()) {
      return next(new BadRequestError(userRequest["__validationError"]()));
    }

    // Check existing user
    const existingUser = await this.userService.findByUsername(userRequest.username);
    if (existingUser) {
      return next(new ConflictError("User '%s' already exist", existingUser.username));
    }

    // Create user and send response
    const user = await this.userService.save(userRequest);
    const userResponse: IUserResponse = {
      group: user.group,
      username: user.username,
    };
    return res.json(201, userResponse, {location: `/user/${user.username}`});
  };
}
