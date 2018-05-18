"use strict";

import {RedisClient} from "redis";

class PubService<T> {
  private readonly redisClient: RedisClient;
  private readonly channel: string;

  constructor(redisClient: RedisClient, channel: string) {
    this.redisClient = redisClient;
    this.channel = channel;
  }

  public publish = (message: T): boolean => {
    return this.redisClient.publish(this.channel, JSON.stringify(message));
  }
}

export default PubService;
