"use strict";

import "mocha";

import * as assert from "assert";
import {Response} from "request";
import * as rp from "request-promise";
import {IUserRequest} from "../../src/controller/request/userRequest";
import {IUserResponse} from "../../src/controller/request/userResponse";

describe("User API test", () => {
  const userRequest: IUserRequest = {
    group: [1000, 10010],
    password: "discloudpwd",
    username: "discloud",
  };

  it("Successful create user", async () => {
    const createUserFullResponse: Response = await rp.post("http://127.0.0.1:8000/user", {
      body: userRequest,
      json: true,
      resolveWithFullResponse: true,
    });
    assert.strictEqual(createUserFullResponse.statusCode, 201);
    assert.strictEqual(createUserFullResponse.headers.location, `/user/${userRequest.username}`);
    const createUserResponse: IUserResponse = createUserFullResponse.body;
    assert.strictEqual(createUserResponse.username, userRequest.username);
    assert.deepStrictEqual(createUserResponse.group, userRequest.group);
  });
});
