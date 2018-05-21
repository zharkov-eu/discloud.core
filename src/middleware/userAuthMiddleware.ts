"use strict";

"use strict";

import * as restify from "restify";
import authBackend from "../backend/auth/authBackend";
import {logger} from "../logger";

const tokenDelimiter = ":::";

const noUserAuthCheck: Array<{ method: string, url: RegExp }> = [
  {method: "post", url: new RegExp("^/user")},
  {method: "get", url: new RegExp("^/node/*")},
  {method: "get", url: new RegExp("^/share/*")},
];

const userAuthCheck = async (req: restify.Request, res: restify.Response, next: restify.Next) => {
  let skipAuthCheck = false;
  noUserAuthCheck.forEach((uri) => {
    if (req.method === uri.method && uri.url.test(req.url)) {
      skipAuthCheck = true;
    }
  });
  if (skipAuthCheck) return next();

  if (!req.headers["authorization"].startsWith("Bearer ")) {
    return res.json(401, {success: false});
  } else {
    try {
      const accessToken = req.headers["authorization"].slice("Bearer ".length);
      const indexOfDelimiter = accessToken.lastIndexOf(tokenDelimiter);
      if (indexOfDelimiter && parseInt(accessToken.slice(indexOfDelimiter + 1, accessToken.length), 10)) {
        req.username = (await authBackend.appCheck({accessToken})).username;
      } else {
        req.username = (await authBackend.check({accessToken})).username;
      }
      return next();
    } catch (error) {
      logger.error("User authCheck: " + error.message);
      return res.json(401, {success: false});
    }
  }
};

const userAuthMiddleware = () => userAuthCheck;
export default userAuthMiddleware;
