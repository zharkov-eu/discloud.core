"use strict";

import {IsBoolean, IsNumber, NotEmptyString, Validate, ValidationError} from "validation-api";

export interface IGroupRequest {
  id?: number;
  name?: string;
  system?: boolean;
}

@Validate({throwable: false})
export default class GroupRequest implements IGroupRequest {
  @IsNumber()
  public id: number;

  @NotEmptyString()
  public name: string;

  @IsBoolean()
  public system: boolean;

  constructor(request: IGroupRequest, required: IGroupRequest = {}) {
    if (!request || typeof request !== "object") {
      throw new ValidationError([{
        constraint: "object",
        message: "GroupRequest not a object",
        property: undefined,
        value: undefined,
      }]);
    }
    if (required.id || request.id) this.id = request.id;
    if (required.name || request.name) this.name = request.name;
    if (required.system || request.system) this.system = request.system;
  }
}
