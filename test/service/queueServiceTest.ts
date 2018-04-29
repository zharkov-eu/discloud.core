"use strict";

import "mocha";

import * as assert from "assert";
import * as path from "path";
import {RedisClient} from "redis";
import {promisify} from "util";
import {v4} from "uuid";
import config from "../../config";

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

const client = new RedisClient({
  host: configRedis.host,
  port: configRedis.port,
});

client.on("connect", () => {
  describe("QueueServiceTest", () => {
    it("", async () => {
      assert.strictEqual(true, true);
    });
  });
});
