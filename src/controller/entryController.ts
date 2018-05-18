"use strict";

import * as restify from "restify";
import {BadRequestError} from "restify-errors";
import EntryService from "../service/entryService";
import UserService from "../service/userService";
import EntryRequest from "./request/entryRequest";
import EntryResponse from "./request/entryResponse";

export default class EntryController {
  private readonly entryService: EntryService;
  private readonly userService: UserService;

  constructor(entryService: EntryService, userService: UserService) {
    this.entryService = entryService;
    this.userService = userService;
  }

  public getEntries = async (req: restify.Request, res: restify.Response) => {
    const entries = await this.entryService.getAll(req.params.id);
    const entriesResponse = entries.map(entry => new EntryResponse(entry));
    return res.json(200, entriesResponse);
  };

  public getPaths = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public getEntry = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public getPath = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public post = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entryRequest = new EntryRequest(req.body, {
      group: "required" as any,
      location: "required" as any,
      name: "required" as any,
      owner: "required" as any,
      path: "required" as any,
      permission: "required" as any,
      type: "required" as any,
    });
    if (entryRequest["__validationError"] && entryRequest["__validationError"]()) {
      return next(new BadRequestError(entryRequest["__validationError"]()));
    }

    const user = await this.userService.findById(entryRequest.owner);
    const entry = await this.entryService.save(user.id, entryRequest);

    return res.json(201, {}, {location: `/upload/${entry.uuid}`});
  };

  public patchEntry = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public patchPath = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public delEntry = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public delPath = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };
}
