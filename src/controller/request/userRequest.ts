"use strict";

import {NotEmpty, NotEmptyString, Validate} from "validation-api";

export interface IUserRequest {
  username?: string;
  group?: string[];
  password?: string;
}

@Validate({throwable: false})
export default class UserRequest implements IUserRequest {
  @NotEmptyString()
  public username: string;

  @NotEmpty()
  public group: string[];

  @NotEmptyString()
  public password: string;

  constructor(request: IUserRequest, required: IUserRequest = {}) {
    if (!request || typeof request !== "object") {
      throw new Error();
    }
    if (required.username || request.username) {
      this.username = request.username;
    }
    if (required.group || request.group) {
      this.group = request.group;
    }
    if (required.password || request.password) {
      this.password = request.password;
    }
  }
}
