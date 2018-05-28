"use strict";

import * as jwt from "jsonwebtoken";
import * as restify from "restify";
import {ProxyAuthenticationRequiredError} from "restify-errors";
import IProxyUser from "../interface/proxyUser";
import LruCache from "../lib/lruCache";

const delimiter = ":::";
const proxyUsers: Map<string, IProxyUser> = new Map();
const tokenLruCache: LruCache<Date> = new LruCache(100);
let secret: string = "SECRET";

const proxyAuthCheck = (proxyUsersList?: IProxyUser[], authSecret?: string) => {
  if (proxyUsersList) proxyUsersList.forEach(it => proxyUsers.set(it.username, it));
  if (authSecret) secret = authSecret;

  return async (req: restify.Request, res: restify.Response, next: restify.Next) => {
    const authorization = req.headers["authorization"];

    if (authorization && authorization.startsWith("Basic ")) {
      const user = userFromBasicAuth(authorization);
      if (user != null) {
        const token = createAccessToken(user);
        res.setHeader("X-Auth-Token", token.token);
        res.setHeader("X-Auth-Expire", token.expire);
      }
      if (res.getHeader("X-Auth-Token")) return next();
    }

    if (authorization && authorization.startsWith("Bearer ")) {
      if (checkAccessToken(authorization.substring("Bearer".length).trim())) return next();
    }

    next(new ProxyAuthenticationRequiredError());
  };
};

function checkAccessToken(token: string): boolean {
  if (token.split(delimiter).length !== 2) return false;
  const credentials = {username: token.split(delimiter)[0], accessToken: token.split(delimiter)[1]};
  const now = new Date();

  const user = proxyUsers.get(credentials.username);
  if (!user) return false;

  const cachedExpirationDate = tokenLruCache.get(credentials.accessToken);
  if (cachedExpirationDate && now.getTime() < cachedExpirationDate.getTime()) return true;

  try {
    const decoded = jwt.verify(credentials.accessToken, user.password + secret);
    if (decoded["user"] === user.username && now.getTime() < decoded["exp"] * 1000) {
      tokenLruCache.set(credentials.accessToken, new Date(decoded["exp"] * 1000));
      return true;
    }
  } catch (e) {
    return false;
  }

  return false;
}

function createAccessToken(user: IProxyUser): { token: string, expire: number } {
  const now = new Date();
  const expirationSeconds = 60 * 60;
  const expirationDate = new Date(now.getTime() + (expirationSeconds * 1000));
  const sign = user.password + secret;
  const accessToken = jwt.sign({
    user: user.username,
  }, sign, {expiresIn: expirationSeconds});
  return {token: user.username + delimiter + accessToken, expire: expirationDate.getTime() - now.getTime()};
}

function userFromBasicAuth(authorization: string): IProxyUser | null {
  if (!authorization || !authorization.startsWith("Basic")) return null;
  const base64Credentials = authorization.substring("Basic".length).trim();
  const credentials = Buffer.from(base64Credentials, "base64").toString().split(":");
  const proxyUser = proxyUsers.get(credentials[0]);
  return proxyUser && proxyUser.password === credentials[1] ? proxyUser : null;
}

export default proxyAuthCheck;
