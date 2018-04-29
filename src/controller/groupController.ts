"use strict";

import * as restify from "restify";
import {BadRequestError, ConflictError, NotFoundError} from "restify-errors";
import GroupService from "../service/groupService";
import GroupRequest from "./request/groupRequest";
import GroupResponse from "./request/groupResponse";

export default class GroupController {
  private readonly groupService: GroupService;

  constructor(groupService: GroupService) {
    this.groupService = groupService;
  }

  public getAll = async (req: restify.Request, res: restify.Response) => {
    const groups = await this.groupService.findAll();

    const groupsResponse = groups.map(group => new GroupResponse(group));
    return res.json(200, groupsResponse);
  };

  public get = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const group = await this.groupService.findById(req.params.id);
    if (!group) {
      return next(new NotFoundError("Group by id {'%s'} not found", req.params.id));
    }

    return res.send(200, new GroupResponse(group));
  };

  public post = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const groupRequest = new GroupRequest(req.body, {name: "required"});
    if (groupRequest["__validationError"] && groupRequest["__validationError"]()) {
      return next(new BadRequestError(groupRequest["__validationError"]()));
    }

    const existingGroup = await this.groupService.findByName(groupRequest.name);
    if (existingGroup) {
      return next(new ConflictError("Group '%s' already exist", existingGroup.name));
    }

    const group = await this.groupService.save(groupRequest);

    return res.json(201, new GroupResponse(group), {location: `/group/${group.id}`});
  };

  public patch = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const groupRequest = new GroupRequest(req.body);
    if (groupRequest["__validationError"] && groupRequest["__validationError"]()) {
      return next(new BadRequestError(groupRequest["__validationError"]()));
    }

    const group = await this.groupService.findById(req.params.id);
    if (!group) {
      return next(new NotFoundError("Group by id {'%s'} not found", req.params.id));
    }

    await this.groupService.update(req.params.id, {...groupRequest, id: undefined});

    return res.json(200, new GroupResponse(group));
  };

  public del = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const group = await this.groupService.findById(req.params.id);
    if (!group) {
      return next(new NotFoundError("Group by id {'%s'} not found", req.params.id));
    }

    await this.groupService.delete(req.params.id);
    return res.send(204);
  };
}
