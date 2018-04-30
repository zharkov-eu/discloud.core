"use strict";

import INode, {NodeRoleEnum} from "../../interface/node";

const NodeRoleEnumMapping: { [key: string]: "master" | "slave" } = {
  [NodeRoleEnum.MASTER]: "master",
  [NodeRoleEnum.SLAVE]: "slave",
};

export interface INodeResponse {
  uid: string;
  ipv4: string;
  role: "master" | "slave";
  zone: string;
}

export default class NodeResponse implements INodeResponse {
  public uid: string;
  public ipv4: string;
  public role: "master" | "slave";
  public zone: string;

  constructor(node: INode) {
    this.ipv4 = node.ipv4;
    this.role = NodeRoleEnumMapping[node.role];
    this.uid = node.uid;
    this.zone = node.zone;
  }
}
