"use strict";

import IGroup from "../../interface/group";

export interface IGroupResponse {
  id: number;
  name: string;
  system: boolean;
}

export default class GroupResponse implements IGroupResponse {
  public id: number;
  public name: string;
  public system: boolean;

  constructor(group: IGroup) {
    this.id = group.id;
    this.name = group.name;
    this.system = group.system;
  }
}
