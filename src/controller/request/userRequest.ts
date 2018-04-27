"use strict";

import {IsNumber, NotEmpty, NotEmptyString, Validate, ValidationError} from "validation-api";

export interface IUserRequest {
  id?: number;
  username?: string;
  group?: number[];
  password?: string;
}

@Validate({throwable: false})
export default class UserRequest implements IUserRequest {
  @IsNumber()
  public id: number;

  @NotEmptyString()
  public username: string;

  @NotEmpty()
  public group: number[];

  @NotEmptyString()
  public password: string;

  constructor(request: IUserRequest, required: IUserRequest = {}) {
    if (!request || typeof request !== "object") {
      throw new ValidationError([{
        constraint: "object",
        message: "UserRequest not a object",
        property: undefined,
        value: undefined,
      }]);
    }
    if (required.id || request.id) {
      this.id = request.id;
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
