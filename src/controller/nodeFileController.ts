"use strict";

import * as path from "path";
import * as restify from "restify";
import {NodeUnavailableError} from "../error";
import INode from "../interface/node";
import AbstractEntryService from "../service/abstractEntryService";
import RegistryService from "../service/registryService";

export default class NodeFileController {
  private readonly entryService: AbstractEntryService;
  private readonly registryService: RegistryService;

  constructor(entryService: AbstractEntryService, registryService: RegistryService) {
    this.entryService = entryService;
    this.registryService = registryService;
  }

  public getByUuid = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByUUID(req.params.userid, req.params.uuid);

    const nodes = entry.location.map(it => AbstractEntryService.extendLocation(it));
    const targetNode = await this.getTargetNode(nodes.map(it => it.uid));
    if (!targetNode) {
      throw new NodeUnavailableError("No nodes with file '{" + req.params.uuid + "}' available");
    }

    const splitPath = entry.path.split("/").filter(it => it !== "");
    const redirectUrl = [this.getNodePath(targetNode), "data", req.params.userid];
    if (splitPath.length) redirectUrl.push(...splitPath);
    redirectUrl.push(entry.name);
    return res.redirect(303, redirectUrl.join("/"), next);
  };

  public getByPath = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const entry = await this.entryService.getByPath(req.params.userid, req.params.path);
    return res.redirect(303, path.resolve("data", req.params.userid, entry.path, entry.name), next);
  };

  private getNodePath = (node: INode): string => {
    return node.protocol + "://" + (node.host || node.ipv4) + ":" + node.port;
  };

  private getTargetNode = async (uids: string[]): Promise<INode> => {
    const nodesAvailability = await this.checkNodesAvailable(uids);
    const nodesAvailable = Array.from(nodesAvailability.entries())
        .map(it => ({uid: it[0], alive: it[1]}))
        .filter(node => node.alive);
    if (nodesAvailable.length === 0) return undefined;
    const targetNodeUid = nodesAvailable[Math.round(Math.random() * nodesAvailable.length - 0.5)].uid;
    return nodesAvailability.get(targetNodeUid);
  };

  private checkNodesAvailable = async (uids: string[]): Promise<Map<string, INode>> => {
    const nodeMap = new Map<string, INode>();
    uids.forEach(uid => nodeMap.set(uid, undefined));

    const nodes = await this.registryService.getAllNodesGlobal();
    nodes.forEach(node => nodeMap.has(node.uid) ? nodeMap.set(node.uid, node) : undefined);
    return nodeMap;
  };
}
