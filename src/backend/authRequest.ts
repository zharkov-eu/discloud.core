"use strict";

import {CoreOptions} from "request";
import * as rp from "request-promise";

export interface ICredentials {
  username: string;
  password: string;
}

function authRequestWrapper(credentials: ICredentials) {
  let authToken = "";

  function requestWrapper(method: string) {
    return async (options: CoreOptions & { uri: string }) => {
      let response = null;
      try {
        options = authToken ? {...options, auth: {bearer: authToken}} : options;
        response = await rp[method](options);
      } catch (error) {
        if (error.statusCode === 401) {
          const authorizationHeader = {
            Authorization: "Basic " + new Buffer(credentials.username + ":" + credentials.password).toString("base64"),
          };
          options = Object.assign({}, options, {headers: authorizationHeader, resolveWithFullResponse: true});
          response = await rp[method](options);
          authToken = response.headers["auth-token"];
          response = response.body;
        } else {
          throw error;
        }
      }
      return response;
    };
  }

  return {
    delete: requestWrapper("delete"),
    get: requestWrapper("get"),
    patch: requestWrapper("patch"),
    post: requestWrapper("post"),
  };
}

const authRequest = (credentials: ICredentials) => authRequestWrapper(credentials);

export default authRequest;
