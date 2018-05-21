"use strict";

export enum NodeRoleEnum {
  MASTER = "m",
  SLAVE = "s",
}

export interface INodeRedis {
  ipv4: string;
  location: string;
  protocol: string;
  port: number;
}

export default interface INode {
  uid: string;
  ipv4: string;
  location: string;
  protocol: string;
  port: number;
  role: NodeRoleEnum;
  zone: string;
}
