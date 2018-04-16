"use strict";

import {RedisClient} from "redis";
import RegistryService from "./service/registryService";

class Node {
  public uid: string;
  public ipv4: string;
  private registryService: RegistryService;
  private updateAliveFieldInt: NodeJS.Timer;

  constructor(client: RedisClient) {
    this.registryService = new RegistryService(client);
  }

  /**
   * Регистрация ноды, инициализация интервала обновления alive-поля
   * @return {Promise<string>}
   */
  public register = async (): Promise<string> => {
    this.ipv4 = this.registryService.getIPv4();
    this.uid = await this.registryService.registerNode(this.ipv4);
    this.updateAliveFieldInt = setInterval(() => this.registryService.updateAliveField(this.uid), 500);
    return this.uid;
  }
}

export default Node;
