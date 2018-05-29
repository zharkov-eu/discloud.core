"use strict";

import INode, {NodeRoleEnum} from "../../interface/node";

const NodeRoleEnumMapping: { [key: string]: "master" | "slave" } = {
  [NodeRoleEnum.MASTER]: "master",
  [NodeRoleEnum.SLAVE]: "slave",
};

export interface INodeResponse {
  uid: string;
  ipv4: string;
  host: string;
  protocol: string;
  port: number;
  role: "master" | "slave";
  zone: string;
}

export default class NodeResponse implements INodeResponse {
  public uid: string;
  public ipv4: string;
  public host: string;
  public protocol: string;
  public port: number;
  public role: "master" | "slave";
  public zone: string;

  constructor(node: INode) {
    this.uid = node.uid;
    this.ipv4 = node.ipv4;
    this.host = node.host;
    this.protocol = node.protocol;
    this.port = node.port;
    this.role = NodeRoleEnumMapping[node.role];
    this.zone = node.zone;
  }
}
