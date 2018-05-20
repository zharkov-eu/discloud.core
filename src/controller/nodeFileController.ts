"use strict";

import * as restify from "restify";
import SlaveFileService from "../service/slaveFileService";

export default class NodeFileController {
  private readonly fileService: SlaveFileService;

  constructor(fileService: SlaveFileService) {
    this.fileService = fileService;
  }

  public get = async (req: restify.Request, res: restify.Response) => {
    return res.send({});
  }
}
