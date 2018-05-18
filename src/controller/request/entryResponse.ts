"use strict";

import IEntry from "../../interface/entry";

export interface IEntryResponse {
  uuid: string;
}

export default class EntryResponse implements IEntryResponse {
  public uuid: string;

  constructor(entry: IEntry) {
    this.uuid = entry.uuid;
  }
}
