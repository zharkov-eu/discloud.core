"use strict";

import * as restify from "restify";
import {NotFoundError} from "restify-errors";
import SlaveEntryService from "../service/slaveEntryService";
import UserService from "../service/userService";
import EntryResponse from "./request/entryResponse";

export default class NodeEntryController {
  private readonly entryService: SlaveEntryService;
  private readonly userService: UserService;

  constructor(entryService: SlaveEntryService, userService: UserService) {
    this.entryService = entryService;
    this.userService = userService;
  }

  public getEntries = async (req: restify.Request, res: restify.Response) => {
    await this.checkUserThrowable(req);
    const entries = await this.entryService.getAll(req.params.userid);
    const entriesResponse = entries.map(entry => new EntryResponse(entry));
    return res.json(200, entriesResponse);
  };

  public getEntry = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    await this.checkUserThrowable(req);
    const entry = await this.entryService.getByUUID(req.params.userid, req.params.entryuid);
    if (!entry) return next(new NotFoundError("Entry by uuid '{" + req.params.entryuid + "} not found"));

    return res.json(200, entry);
  };

  public getPath = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    await this.checkUserThrowable(req);
    const entry = await this.entryService.getByPath(req.params.userid, req.params.path);
    if (!entry) return next(new NotFoundError("Entry by path '{" + req.params.path + "} not found"));

    return res.json(200, entry);
  };

  private checkUserThrowable = async (req: restify.Request) => {
    const user = await this.userService.findById(parseInt(req.params.userid, 10));
    if (!user) throw new NotFoundError("User by id '{" + req.params.userid + "}' not found");
  }
}
