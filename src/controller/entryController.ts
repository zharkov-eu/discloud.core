"use strict";

import * as restify from "restify";
import EntryService from "../service/entryService";
import FileService from "../service/fileService";

export default class EntryController {
  private readonly entryService: EntryService;
  private readonly fileService: FileService;

  constructor(entryService: EntryService, fileService: FileService) {
    this.entryService = entryService;
    this.fileService = fileService;
  }

  public get = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public post = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public patch = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };

  public del = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, {});
  };
}
