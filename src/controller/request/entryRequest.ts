"use strict";

import {IsMemberOf, IsNumber, NotEmpty, NotEmptyString, Validate, ValidationError} from "validation-api";
import {EntryShare, EntryType} from "../../interface/entry";

export interface IEntryRequest {
  name?: string;
  type?: EntryType;
  parent?: string;
  path?: string;
  owner?: number;
  group?: number;
  permission?: string;
  share?: EntryShare;
  location?: string[];
}

@Validate({throwable: false})
export default class EntryRequest implements IEntryRequest {
  @NotEmptyString()
  public name?: string;

  @IsMemberOf({array: [EntryType.DIRECTORY, EntryType.FILE]})
  public type?: EntryType;

  @NotEmptyString()
  public parent?: string;

  @NotEmptyString()
  public path?: string;

  @IsNumber()
  public owner?: number;

  @IsNumber()
  public group?: number;

  @NotEmptyString()
  public permission?: string;

  @IsMemberOf({array: [EntryShare.LINK]})
  public share?: EntryShare;

  @NotEmpty()
  public location?: string[];

  constructor(request: IEntryRequest, required: IEntryRequest = {}) {
    if (!request || typeof request !== "object") {
      throw new ValidationError([{
        constraint: "object",
        message: "EntryRequest not a object",
        property: undefined,
        value: undefined,
      }]);
    }
  }
}
