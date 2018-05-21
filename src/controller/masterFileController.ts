"use strict";

import * as restify from "restify";
import INode from "../interface/node";
import AbstractEntryService from "../service/abstractEntryService";
import MasterFileService from "../service/masterFileService";

export default class MasterFileController {
  private readonly baseUrl: string;
  private readonly entryService: AbstractEntryService;
  private readonly fileService: MasterFileService;

  constructor(node: INode, fileService: MasterFileService) {
    this.baseUrl = `${node.protocol}://${node.location || node.ipv4}:${node.port || 80}/`;
    this.fileService = fileService;
  }

  public getMasterByUuid = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByUUID(req.params.userid, req.params.uuid);
    const splitPath = entry.path.split("/").filter(it => it !== "");
    const redirectUrl = [this.baseUrl, "data", req.params.userid];
    if (splitPath.length) redirectUrl.push(...splitPath);
    redirectUrl.push(entry.name);
    return res.redirect(303, redirectUrl.join("/"), next);
  };

  public post = async (req: restify.Request, res: restify.Response) => {
    await this.fileService.saveFile(req, {
      entryUuid: req.params.entryuid,
      userId: parseInt(req.params.userid, 10),
    });
    res.json(200, {Success: true});
  };
}
