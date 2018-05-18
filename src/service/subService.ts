"use strict";

import {RedisClient} from "redis";
import {logger} from "../logger";

class SubService<T> {
  private readonly redisClient: RedisClient;
  private readonly channel: string;

  constructor(redisClient: RedisClient, channel: string, cb: (message: T) => void) {
    this.redisClient = redisClient;
    this.channel = channel;
    this.redisClient.subscribe(channel, (err: Error, message: string) => {
      if (!err) logger.error("Error on subscribe channel " + this.channel);
      else cb(JSON.parse(message) as T);
    });
  }
}

export default SubService;
