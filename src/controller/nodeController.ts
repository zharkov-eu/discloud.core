"use strict";

import * as restify from "restify";
import NodeWorker from "../nodeWorker";
import RegistryService from "../service/registryService";
import NodeResponse from "./request/nodeResponse";

export default class NodeController {
  private readonly node: NodeWorker;
  private readonly registryService: RegistryService;

  constructor(node: NodeWorker, registryService: RegistryService) {
    this.node = node;
    this.registryService = registryService;
  }

  public getAll = async (req: restify.Request, res: restify.Response) => {
    const nodes = await this.registryService.getAllNodes();
    return res.json(200, nodes.map(node => new NodeResponse(node)));
  };

  public get = async (req: restify.Request, res: restify.Response) => {
    return res.json(200, new NodeResponse(this.node.getNodeInfo()));
  };
}
