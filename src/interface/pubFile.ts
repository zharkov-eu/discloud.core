"use strict";

import INode from "./node";

export default interface IPubFile {
  location: string[];
  origin: INode;
  size: number; // In kilobytes
  userId: number;
  uuid: string;
}
