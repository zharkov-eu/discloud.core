"use strict";

export enum NodeRoleEnum {
  MASTER = "m",
  SLAVE = "s",
}

export default interface INode {
  uid: string;
  ipv4: string;
  role: NodeRoleEnum;
  zone: string;
}
