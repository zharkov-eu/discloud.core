"use strict";

import * as restify from "restify";
import {NotFoundError} from "restify-errors";
import SlaveEntryService from "../service/slaveEntryService";
import EntryResponse from "./request/entryResponse";

export default class NodeEntryController {
  private readonly entryService: SlaveEntryService;

  constructor(entryService: SlaveEntryService) {
    this.entryService = entryService;
  }

  public getEntries = async (req: restify.Request, res: restify.Response) => {
    const entries = await this.entryService.getAll(req.params.id);
    const entriesResponse = entries.map(entry => new EntryResponse(entry));
    return res.json(200, entriesResponse);
  };

  public getEntry = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByUUID(req.params.userid, req.params.entryuid);
    if (!entry) return next(new NotFoundError("Entry by uuid '{" + req.params.entryuid + "} not found"));

    return res.json(200, entry);
  };

  public getPath = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByPath(req.params.userid, req.params.path);
    if (!entry) return next(new NotFoundError("Entry by path '{" + req.params.path + "} not found"));

    return res.json(200, entry);
  };
}
