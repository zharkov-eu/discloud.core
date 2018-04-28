"use strict";

import {RedisClient} from "redis";
import {promisify} from "util";

let client: RedisClient;
let rpopAsync: (key: string) => Promise<number>;
let lpushAsync: (key: string, value: any) => Promise<number>;

function initClient(redisClient: RedisClient) {
  client = redisClient;
  rpopAsync = promisify(client.rpop).bind(client);
  lpushAsync = promisify(client.lpush).bind(client);
}

class QueueService<T> {
  private readonly uid: string;
  private readonly name: string;
  private readonly queueName: string;

  constructor(redisClient: RedisClient, options: { uid: string, name: string }) {
    initClient(redisClient);
    if (!options && typeof options !== "object") {
      throw new Error("HashQueueService init: options not a object");
    }
    this.uid = options.uid;
    this.name = options.name;
    this.queueName = "queue_" + this.uid + "_" + this.name;
  }
}

export default QueueService;
