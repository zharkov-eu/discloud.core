"use strict";

import {RedisClient} from "redis";
import {promisify} from "util";

let client: RedisClient;
let lpushAsync: (key: string, value: any) => Promise<number>;

function initClient(redisClient: RedisClient) {
  client = redisClient;
  lpushAsync = promisify(client.lpush).bind(client);
}

const delimiter = ":::";

class QueueService<T> {
  private readonly queueName: string;

  constructor(redisClient: RedisClient, options: { name: string }) {
    initClient(redisClient);
    if (!options && typeof options !== "object") {
      throw new Error("QueueService init: options not a object");
    }
    this.queueName = `queue${delimiter}${options.name}`;
  }

  public async enqueue(element: T): Promise<void> {
    await lpushAsync(this.queueName, JSON.stringify(element));
  }
}

export default QueueService;
