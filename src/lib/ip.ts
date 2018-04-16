"use strict";

import {networkInterfaces} from "os";

/**
 * Получение сетевых интерфейсов IPv4, исключая 127.0.0.1
 * Возвращает интерфейсы в формате Map {Название интерфейса: IPv4}
 * @return {object}
 */
export const getNetworkInterfaces = (): { [iface: string]: string } => {
  const ifaces = networkInterfaces();
  const ifaceMap = {};

  Object.keys(ifaces).forEach((ifname) => {
    ifaces[ifname].forEach((iface) => {
      if (iface.family === "IPv4" || iface.internal === false) {
        ifaceMap[ifname] = iface.address;
      }
    });
  });
  return ifaceMap;
};
