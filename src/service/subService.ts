"use strict";

import {RedisClient} from "redis";
import config from "../../config";
import {logger, LogType} from "../logger";

const configRedis = config.redis || {host: "127.0.0.1", port: 6379};

class SubService<T> {
  private readonly redisClient: RedisClient;
  private readonly channel: string;

  constructor(channel: string, cb: (message: T) => void) {
    this.redisClient = new RedisClient(configRedis);
    this.channel = channel;
    this.redisClient.subscribe(channel, (err: Error, message: string) => {
      if (err) {
        logger.error({type: LogType.SYSTEM}, "Error on subscribe channel " + this.channel + "; error = " + err.message);
      } else {
        logger.info({type: LogType.SYSTEM}, "Subscribe channel " + this.channel + "; message: " + message);
      }
    });
    this.redisClient.on("message", (err: Error, message: string) => {
      cb(JSON.parse(message) as T);
    });
  }

  public unsubscribe = () => {
    this.redisClient.unsubscribe(this.channel);
    logger.info({type: LogType.SYSTEM}, "Unsubscribe channel " + this.channel);
    this.redisClient.end(true);
  }
}

export default SubService;
