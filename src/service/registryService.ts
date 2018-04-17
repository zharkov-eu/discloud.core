"use strict";

import * as crypto from "crypto";
import {RedisClient} from "redis";
import {promisify} from "util";
import config from "../../config";
import {getNetworkInterfaces} from "../lib/ip";

const randomBytesAsync = promisify(crypto.randomBytes);

class RegistryService {
  private readonly client: RedisClient;
  private readonly getAsync: (key: string) => Promise<string>;
  private readonly setAsync: (key: string, value: string, mode: string, expire: string, seconds: number)
      => Promise<"OK" | undefined>;
  private readonly delAsync: (...keys: string[]) => Promise<"OK" | undefined>;
  private readonly hkeysAsync: (key: string) => Promise<string[]>;
  private readonly hsetnxAsync: (key: string, field: string, value: string) => Promise<number>;
  private readonly setexAsync: (key: string, seconds: number, value: string) => Promise<"OK" | undefined>;
  private readonly hdelAsync: (key: string, ...args: string[]) => Promise<"OK" | undefined>;

  constructor(client: RedisClient) {
    this.client = client;
    this.getAsync = promisify(this.client.get).bind(this.client);
    this.setAsync = promisify(this.client.set).bind(this.client);
    this.delAsync = promisify(this.client.del).bind(this.client);
    this.hkeysAsync = promisify(this.client.hkeys).bind(this.client);
    this.hsetnxAsync = promisify(this.client.hsetnx).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
    this.hdelAsync = promisify(this.client.hdel).bind(this.client);
  }

  /**
   * Получить IPv4 адрес ноды
   * @throws {Error} - ошибка в случае отсутствия заданного в конфигурации и публичных интерфейсов
   * @return {string}
   */
  public getIPv4 = (): string => {
    const ifaces = getNetworkInterfaces();
    if (!config.ipv4 && Object.keys(ifaces).length === 0) {
      throw new Error("Please specify IPv4 address");
    }
    return config.ipv4 || Object.keys(ifaces)[0];
  };

  /**
   * Регистрация ноды
   * @param {string} ipv4
   * @return {Promise<string>}
   */
  public registerNode = async (ipv4: string): Promise<string> => {
    const uid = (await randomBytesAsync(24)).toString("hex");
    const code = await this.hsetnxAsync("node", uid, ipv4);
    return (code !== 1) ? this.registerNode(ipv4) : Promise.resolve(uid);
  };

  /**
   * Обновление значения Alive-поля
   * @param {string} uid
   * @return {Promise<void>}
   */
  public updateAliveField = async (uid: string): Promise<void> => {
    const code = await this.setexAsync("node:" + uid, 1, "alive");
    if (code !== "OK") {
      throw new Error("Can't update alive field for node: " + uid);
    }
  };

  /**
   * Проверка работы мастер-ноды
   * @return {Promise<boolean>}
   */
  public checkMasterAliveField = async (): Promise<boolean> => {
    return Boolean(await this.getAsync("masterNode"));
  };

  /**
   * Обновление значения Alive-поля master-ноды
   * @param {string} uid
   * @return {Promise<void>}
   */
  public updateMasterAliveField = async (uid: string): Promise<void> => {
    const code = await this.setexAsync("masterNode", 1, "node:" + uid);
    if (code !== "OK") {
      throw new Error("Can't update alive field for node: " + uid);
    }
  };

  /**
   * Проверка актуальности списка нод
   * @return {Promise<void>}
   */
  public checkNodeMap = async (): Promise<void> => {
    const code = await this.setAsync("checkNodeMap", "lock", "NX", "EX", 5);
    if (code !== "OK") {
      return;
    }
    const nodesUUID = await this.hkeysAsync("node");
    const nodeAlivePromises = [];
    for (const nodeUUID of nodesUUID) {
      nodeAlivePromises.push(
          new Promise(resolve => this.getAsync("node:" + nodeUUID)
              .then(reply => resolve({uuid: nodeUUID, alive: reply})),
          ));
    }
    const nodesAlive = await Promise.all(nodeAlivePromises);
    const deathNodes = nodesAlive.filter(nodeAlive => nodeAlive.alive !== "alive");
    if (deathNodes.length) {
      await this.hdelAsync("node", ...deathNodes.map(node => node.uuid));
    }
    await this.delAsync("checkNodeMap");
  };

  /**
   * Выбор мастера
   * @return {Promise<void>}
   */
  public masterElection = async (uid: string): Promise<boolean> => {
    const code = await this.setAsync("masterNode", "node:" + uid, "NX", "EX", 1);
    return code === "OK";
  };
}

export default RegistryService;
