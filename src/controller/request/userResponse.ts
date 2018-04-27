"use strict";

import IUser from "../../interface/user";

export interface IUserResponse {
  id: number;
  username: string;
  group: number[];
}

export default class UserResponse implements IUserResponse {
  public id: number;
  public username: string;
  public group: number[];

  constructor(user: IUser) {
    this.id = user.id;
    this.username = user.username;
    this.group = user.group;
  }
}
