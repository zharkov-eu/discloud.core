"use strict";

import "mocha";

import * as assert from "assert";
import {RedisClient} from "redis";
import {promisify} from "util";
import {v4} from "uuid";
import config from "../../config";
import HashQueueService from "../../src/service/hashQueueService";

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

const client = new RedisClient({
  host: configRedis.host,
  port: configRedis.port,
});

const delAsync = promisify(client.del).bind(client);
const hgetAsync = promisify(client.hget).bind(client);

client.on("connect", () => {
  const uid = v4();
  const name = "testHashQueue" + Math.random() * 100;

  describe("HashQueueServiceTest", () => {
    const hashQueueService = new HashQueueService(client, {uid, name});

    it("HashQueue Enqueue успешно сохраняет значение", async () => {
      const success = await hashQueueService.enqueue("testField", "success");
      assert.strictEqual(success, true);
      const value = await hgetAsync(hashQueueService.hashQueueName, "testField");
      assert.strictEqual(value, "success");
    });

    it("HashQueue GetFields успешно выбирает ключи", async () => {
      await hashQueueService.enqueue("nextTestField", "fail");
      const fields = await hashQueueService.getFields();
      assert.deepStrictEqual(fields, ["testField", "nextTestField"]);
    });

    it("HashQueue Dequeue успешно удаляет значение", async () => {
      const success = await hashQueueService.dequeue("testField");
      assert.strictEqual(success, true);
      const value = await hgetAsync(hashQueueService.hashQueueName, "testField");
      assert.strictEqual(value, null);
      await hashQueueService.dequeue("nextTestField");
    });

    it("Очищает тестовое окружение", async () => {
      await delAsync(hashQueueService.hashQueueName);
    });
  });
});
