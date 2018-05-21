"use strict";

import {RedisClient} from "redis";
import {promisify} from "util";
import {v4} from "uuid";
import config from "../../config";
import INode, {INodeRedis, NodeRoleEnum} from "../interface/node";
import {getNetworkInterfaces} from "../lib/ip";
import CassandraRepository from "../repository/cassandra";

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
  private static convertRow(row: { [key: string]: any }): INode {
    return {
      ipv4: row.ipv4,
      location: row.location,
      port: row.port,
      protocol: row.protocol,
      role: row.role,
      uid: row.uid,
      zone: row.zone,
    };
  }

  private readonly zone: string;
  private readonly repository: CassandraRepository;

  constructor(redisClient: RedisClient, repository: CassandraRepository, options: { zone: string }) {
    if (!client) {
      initClient(redisClient);
    }
    this.repository = repository;
    this.zone = options.zone;
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
   * @param {INodeRedis} node
   * @param {string} uid - Использовать переданный uid для регистрации
   * @return {Promise<string>}
   */
  public registerNode = async (node: INodeRedis, uid?: string): Promise<string> => {
    uid = uid || v4();
    const code = await hsetnxAsync("node", uid, JSON.stringify(node));
    return (code !== 1) ? this.registerNode(node) : Promise.resolve(uid);
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
      const node: INodeRedis = JSON.parse(nodeMap[uid]);
      nodes.push({
        ipv4: node.ipv4,
        location: node.location,
        port: node.port,
        protocol: node.protocol,
        role: master.slice(5) === uid ? NodeRoleEnum.MASTER : NodeRoleEnum.SLAVE,
        uid,
        zone: this.zone,
      });
    });
    return nodes;
  };

  /**
   * Получение глобального списка нод (по всем зонам)
   * @return {Promise<INode[]>}
   */
  public getAllNodesGlobal = async (): Promise<INode[]> => {
    const query = "SELECT * FROM node;";
    const result = await this.repository.client.execute(query, [], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return result.rows.map(row => RegistryService.convertRow(row));
  };

  /**
   * Обновить записи для своей зоны
   * @return {Promise<void>}
   */
  public setNodesGlobal = async (): Promise<void> => {
    const nodes = await this.getAllNodes();
    if (nodes.length) {
      const query = "UPDATE node USING TTL 10 SET ipv4 = ?, location = ?, protocol = ?, port = ?, role = ?" +
          " WHERE uid = ? AND zone = ?;";
      const queries = nodes.map(node => (
          {query, params: [node.ipv4, node.location, node.protocol, node.port, node.role, node.uid, node.zone]}
          ));
      await this.repository.client.batch(queries, {prepare: true});
    }
  };
}

export default RegistryService;
