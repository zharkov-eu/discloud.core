"use strict";

import * as crypto from "crypto";
import {Callback, RedisClient} from "redis";
import {promisify} from "util";
import config from "../../config";
import {getNetworkInterfaces} from "../lib/ip";

const randomBytesAsync = promisify(crypto.randomBytes);

class RegistryService {
  private client: RedisClient;
  private hsetnxAsync: (key: string, field: string, value: string) => Promise<number>;
  private setexAsync: (key: string, seconds: number, value: string) => Promise<string>;

  constructor(client: RedisClient) {
    this.client = client;
    this.hsetnxAsync = promisify(this.client.hsetnx).bind(this.client);
    this.setexAsync = promisify(this.client.setex).bind(this.client);
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

  public updateAliveField = async (uid: string): Promise<void> => {
    const code = await this.setexAsync("node:" + uid, 1, "alive");
    if (code !== "OK") {
      throw new Error("Can't update alive field for node: " + uid);
    }
  };
}

export default RegistryService;
