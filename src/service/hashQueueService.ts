"use strict";

import {RedisClient} from "redis";
import {promisify} from "util";

let client: RedisClient;
let hkeysAsync: (key: string) => Promise<string[]>;
let hdelAsync: (key: string, ...args: string[]) => Promise<number>;
let hsetAsync: (key: string, field: string, value: any) => Promise<number>;

function initClient(redisClient: RedisClient) {
  client = redisClient;
  hkeysAsync = promisify(client.hkeys).bind(client);
  hdelAsync = promisify(client.hdel).bind(client);
  hsetAsync = promisify(client.hset).bind(client);
}

class HashQueueService<T> {
  public readonly hashQueueName: string;
  private readonly uid: string;
  private readonly name: string;

  constructor(redisClient: RedisClient, options: { uid: string, name: string }) {
    if (!client) {
      initClient(redisClient);
    }
    if (!options && typeof options !== "object") {
      throw new Error("HashQueueService init: options not a object");
    }
    this.uid = options.uid;
    this.name = options.name;
    this.hashQueueName = "hashqueue_" + this.uid + "_" + this.name;
  }

  public enqueue = async (field: string, value: T): Promise<boolean> => {
    const result = await hsetAsync(this.hashQueueName, field, value);
    return result === 1;
  };

  public dequeue = async (field: string): Promise<boolean> => {
    const result = await hdelAsync(this.hashQueueName, field);
    return result === 1;
  };

  public getFields = async (): Promise<string[]> => {
    return hkeysAsync(this.hashQueueName);
  };
}

export default HashQueueService;
