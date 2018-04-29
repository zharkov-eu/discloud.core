"use strict";

export default interface INode {
  uid: string;
  ipv4: string;
  role: "master" | "slave";
}
