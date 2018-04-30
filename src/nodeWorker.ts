"use strict";

import {RedisClient} from "redis";
import INode, {NodeRoleEnum} from "./interface/node";
import {logger, LogType} from "./logger";
import CassandraRepository from "./repository/cassandra";
import RegistryService from "./service/registryService";

interface INodeOptions {
  uid?: string;
  ipv4?: string;
  zone: string;
}

class NodeWorker {
  public masterCb?: () => any;

  private uid: string;
  private ipv4: string;
  private role: NodeRoleEnum;
  private updateAliveFieldInt: NodeJS.Timer;
  private checkMasterAliveInt?: NodeJS.Timer;
  private updateMasterAliveInt?: NodeJS.Timer;
  private checkNodeMapInt?: NodeJS.Timer;
  private updateGlobalNodeList?: NodeJS.Timer;
  private readonly zone: string;
  private readonly registryService: RegistryService;

  constructor(client: RedisClient, repository: CassandraRepository, options: INodeOptions) {
    this.uid = options.uid;
    this.ipv4 = options.ipv4;
    this.zone = options.zone;
    this.registryService = new RegistryService(client, repository, {zone: options.zone});
  }

  public getNodeInfo = (): INode => ({
    ipv4: this.ipv4,
    role: this.role === NodeRoleEnum.MASTER ? NodeRoleEnum.MASTER : NodeRoleEnum.SLAVE,
    uid: this.uid,
    zone: this.zone,
  });

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
      this.role = await this.registryService.masterElection(this.uid) ? NodeRoleEnum.MASTER : NodeRoleEnum.SLAVE;
      if (this.role === NodeRoleEnum.MASTER) {
        logger.info({type: LogType.SYSTEM}, "NodeWorker:" + this.uid + " is Master now");
        this.startRoleBehavior();
      }
    }
  };

  private startRoleBehavior = (): void => {
    if (this.role === NodeRoleEnum.MASTER) {
      this.checkMasterAliveInt = undefined;
      this.updateMasterAliveInt = setInterval(() => this.registryService.updateMasterAliveField(this.uid), 500);
      this.checkNodeMapInt = setInterval(() => this.registryService.checkNodeMap(), 5000);
      this.updateGlobalNodeList = setInterval(() => this.registryService.setNodesGlobal(), 5000);
      if (this.masterCb) {
        this.masterCb();
      }
    } else {
      this.checkMasterAliveInt = setInterval(() => this.checkMasterAlive(), 500);
    }
  };
}

export default NodeWorker;
