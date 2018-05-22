"use strict";

import INode from "./node";

export enum OperationEnum {
  SAVE = "save",
  UPDATE = "update",
  DELETE = "delete",
}

export default interface IPubFile {
  operation: OperationEnum;
  location: string[];
  origin: INode;
  size: number; // In kilobytes
  userId: number;
  uuid: string;
}
