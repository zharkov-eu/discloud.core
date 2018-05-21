"use strict";

export default interface INodeConfig {
  uid?: string;
  port?: number;
  protocol?: string;
  host?: string;
  bindIp?: string;
  zone?: string;
}
