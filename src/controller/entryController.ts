"use strict";

import * as restify from "restify";
import {BadRequestError} from "restify-errors";
import EntryService from "../service/entryService";
import EntryRequest from "./request/entryRequest";

export default class EntryController {
  private readonly entryService: EntryService;

  constructor(entryService: EntryService) {
    this.entryService = entryService;
  }

  public getEntries = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
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

    const entry = await this.entryService.save(entryRequest);

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
