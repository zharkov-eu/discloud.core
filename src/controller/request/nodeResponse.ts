"use strict";

import INode from "../../interface/node";

export interface INodeResponse {
  uid: string;
  ipv4: string;
  role: "master" | "slave";
}

export default class NodeResponse implements INodeResponse {
  public uid: string;
  public ipv4: string;
  public role: "master" | "slave";

  constructor(node: INode) {
    this.uid = node.uid;
    this.ipv4 = node.ipv4;
    this.role = node.role;
  }
}
