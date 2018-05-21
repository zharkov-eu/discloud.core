"use strict";

import config from "../../../config";
import requestWrapper from "../authrequest";
import IAppTokenRequest from "./interface/appTokenRequest";
import IUserResponse from "./interface/userResponse";
import IUserTokenRequest from "./interface/userTokenRequest";

const apiUrl = config.backend.auth.location;
const rp = requestWrapper({username: config.backend.auth.username, password: config.backend.auth.password});

const authBackend = {
  /*---------------------------------------Check-------------------------------------------*/

  check: (token: IUserTokenRequest): Promise<IUserResponse> => {
    return rp.post({body: token, json: true, uri: apiUrl + "/token/check"});
  },

  /*---------------------------------------OAuthCheck------------------------------------------*/

  appCheck: (token: IAppTokenRequest): Promise<IUserResponse> => {
    return rp.post({body: token, json: true, uri: apiUrl + "/oauth/token/check"});
  },
};

export default authBackend;
