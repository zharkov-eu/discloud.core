"use strict";

export default interface INodeConfig {
  uid?: string;
  port?: number;
  protocol?: string;
  location?: string;
  bindIp?: string;
  zone?: string;
}
