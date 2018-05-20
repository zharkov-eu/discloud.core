"use strict";

import * as restify from "restify";
import MasterFileService from "../service/masterFileService";

export default class MasterFileController {
  private readonly fileService: MasterFileService;

  constructor(fileService: MasterFileService) {
    this.fileService = fileService;
  }

  public post = async (req: restify.Request, res: restify.Response) => {
    await this.fileService.saveFile(req, {
      entryUuid: req.params.entryuid,
      userId: parseInt(req.params.userid, 10),
    });
    res.json(200, {Success: true});
  };
}
