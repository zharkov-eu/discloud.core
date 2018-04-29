"use strict";

import {RedisClient} from "redis";
import {promisify} from "util";
import v4 = require("uuid/v4");
import config from "../../config";
import INode from "../interface/node";
import {getNetworkInterfaces} from "../lib/ip";

let client: RedisClient;
let getAsync: (key: string) => Promise<string>;
let setAsync: (key: string, value: string, mode: string, expire: string, seconds: number) => Promise<"OK" | undefined>;
let delAsync: (...keys: string[]) => Promise<number>;
let hkeysAsync: (key: string) => Promise<string[]>;
let hgetallAsync: (key: string) => Promise<{ [key: string]: string }>;
let hsetnxAsync: (key: string, field: string, value: string) => Promise<number>;
let setexAsync: (key: string, seconds: number, value: string) => Promise<"OK" | undefined>;
let hdelAsync: (key: string, ...args: string[]) => Promise<number>;

function initClient(redisClient: RedisClient) {
  client = redisClient;
  getAsync = promisify(client.get).bind(client);
  setAsync = promisify(client.set).bind(client);
  delAsync = promisify(client.del).bind(client);
  hkeysAsync = promisify(client.hkeys).bind(client);
  hgetallAsync = promisify(client.hgetall).bind(client);
  hsetnxAsync = promisify(client.hsetnx).bind(client);
  setexAsync = promisify(client.setex).bind(client);
  hdelAsync = promisify(client.hdel).bind(client);
}

class RegistryService {
  constructor(redisClient: RedisClient) {
    initClient(redisClient);
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
   * @param {string} uid - Использовать переданный uid для регистрации
   * @return {Promise<string>}
   */
  public registerNode = async (ipv4: string, uid?: string): Promise<string> => {
    uid = uid || v4();
    const code = await hsetnxAsync("node", uid, ipv4);
    return (code !== 1) ? this.registerNode(ipv4) : Promise.resolve(uid);
  };

  /**
   * Обновление значения Alive-поля
   * @param {string} uid
   * @return {Promise<void>}
   */
  public updateAliveField = async (uid: string): Promise<void> => {
    const code = await setexAsync("node:" + uid, 1, "alive");
    if (code !== "OK") {
      throw new Error("Can't update alive field for node: " + uid);
    }
  };

  /**
   * Проверка работы мастер-ноды
   * @return {Promise<boolean>}
   */
  public checkMasterAliveField = async (): Promise<boolean> => {
    return Boolean(await getAsync("masterNode"));
  };

  /**
   * Обновление значения Alive-поля master-ноды
   * @param {string} uid
   * @return {Promise<void>}
   */
  public updateMasterAliveField = async (uid: string): Promise<void> => {
    const code = await setexAsync("masterNode", 1, "node:" + uid);
    if (code !== "OK") {
      throw new Error("Can't update alive field for node: " + uid);
    }
  };

  /**
   * Проверка актуальности списка нод
   * @return {Promise<void>}
   */
  public checkNodeMap = async (): Promise<void> => {
    const code = await setAsync("checkNodeMap", "lock", "NX", "EX", 5);
    if (code !== "OK") {
      return;
    }
    const nodesUUID = await hkeysAsync("node");
    const nodeAlivePromises = [];
    for (const nodeUUID of nodesUUID) {
      nodeAlivePromises.push(
          new Promise(resolve => getAsync("node:" + nodeUUID)
              .then(reply => resolve({uuid: nodeUUID, alive: reply})),
          ));
    }
    const nodesAlive = await Promise.all(nodeAlivePromises);
    const deathNodes = nodesAlive.filter(nodeAlive => nodeAlive.alive !== "alive");
    if (deathNodes.length) {
      await hdelAsync("node", ...deathNodes.map(node => node.uuid));
    }
    await delAsync("checkNodeMap");
  };

  /**
   * Выбор мастера
   * @return {Promise<void>}
   */
  public masterElection = async (uid: string): Promise<boolean> => {
    const code = await setAsync("masterNode", "node:" + uid, "NX", "EX", 1);
    return code === "OK";
  };

  /**
   * Получение списка нод
   * @return {Promise<INode[]>}
   */
  public getAllNodes = async (): Promise<INode[]> => {
    const nodeMap = await hgetallAsync("node");
    const master = await getAsync("masterNode");
    const nodes: INode[] = [];
    Object.keys(nodeMap).forEach(uid => {
      nodes.push({ipv4: nodeMap[uid], role: master.slice(5) === uid ? "master" : "slave", uid});
    });
    return nodes;
  };
}

export default RegistryService;
