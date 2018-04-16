"use strict";

import {RedisClient} from "redis";
import config from "./config";
import {logger} from "./src/logger";
import Node from "./src/node";

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

const client = new RedisClient({
  host: configRedis.host,
  port: configRedis.port,
});

client.on("connect", async () => {
  const node = new Node(client);
  const uid = await node.register();
  logger.info("Node started, uid: " + uid);
});
