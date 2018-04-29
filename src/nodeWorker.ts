"use strict";

import {RedisClient} from "redis";
import INode from "./interface/node";
import {logger, LogType} from "./logger";
import RegistryService from "./service/registryService";

interface INodeOptions {
  uid?: string;
  ipv4?: string;
}

class NodeWorker {
  public masterCb?: () => any;

  private uid: string;
  private ipv4: string;
  private role: "master" | "slave";
  private updateAliveFieldInt: NodeJS.Timer;
  private checkMasterAliveInt?: NodeJS.Timer;
  private updateMasterAliveInt?: NodeJS.Timer;
  private checkNodeMapInt?: NodeJS.Timer;
  private readonly registryService: RegistryService;

  constructor(client: RedisClient, options: INodeOptions = {}) {
    this.uid = options.uid;
    this.ipv4 = options.ipv4;
    this.registryService = new RegistryService(client);
  }

  public getNodeInfo = (): INode => ({uid: this.uid, ipv4: this.ipv4, role: this.role});

  public getRegistryService = (): RegistryService => this.registryService;

  /**
   * Регистрация ноды, инициализация интервала обновления alive-поля
   * @return {Promise<string>}
   */
  public register = async (): Promise<string> => {
    this.ipv4 = this.ipv4 || this.registryService.getIPv4();
    this.uid = await this.registryService.registerNode(this.ipv4, this.uid);
    this.updateAliveFieldInt = setInterval(() => this.registryService.updateAliveField(this.uid), 500);
    this.startRoleBehavior();
    return this.uid;
  };

  private checkMasterAlive = async (): Promise<void> => {
    const isAlive = await this.registryService.checkMasterAliveField();
    if (!isAlive) {
      this.role = await this.registryService.masterElection(this.uid) ? "master" : "slave";
      if (this.role === "master") {
        logger.info({type: LogType.SYSTEM}, "NodeWorker:" + this.uid + " is Master now");
        this.startRoleBehavior();
      }
    }
  };

  private startRoleBehavior = (): void => {
    if (this.role === "master") {
      this.checkMasterAliveInt = undefined;
      this.updateMasterAliveInt = setInterval(() => this.registryService.updateMasterAliveField(this.uid), 500);
      this.checkNodeMapInt = setInterval(() => this.registryService.checkNodeMap(), 5000);
      if (this.masterCb) {
        this.masterCb();
      }
    } else {
      this.checkMasterAliveInt = setInterval(() => this.checkMasterAlive(), 500);
    }
  };
}

export default NodeWorker;
