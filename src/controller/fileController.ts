"use strict";

import * as restify from "restify";
import FileService from "../service/fileService";

export default class FileController {
  private readonly fileService: FileService;

  constructor(fileService: FileService) {
    this.fileService = fileService;
  }

  public post = async (req: restify.Request, res: restify.Response) => {
    await this.fileService.saveFile(req, {user: req.params.id});
    res.json(200, {Success: true});
  };
}
