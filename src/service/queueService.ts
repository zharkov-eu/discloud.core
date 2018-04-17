import {RedisClient} from "redis";

class QueueService {
  private readonly client: RedisClient;

  constructor(client: RedisClient) {
    this.client = client;
  }
}

export default QueueService;
