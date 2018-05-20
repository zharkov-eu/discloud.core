"use strict";

import * as path from "path";
import * as restify from "restify";
import AbstractEntryService from "../service/abstractEntryService";

export default class NodeFileController {
  private readonly entryService: AbstractEntryService;

  constructor(entryService: AbstractEntryService) {
    this.entryService = entryService;
  }

  public getByUuid = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByUUID(req.params.userid, req.params.uuid);
    return res.redirect(303, path.resolve("data", req.params.userid, entry.path, entry.name), next);
  };

  public getByPath = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByPath(req.params.userid, req.params.path);
    return res.redirect(303, path.resolve("data", req.params.userid, entry.path, entry.name), next);
  }
}
