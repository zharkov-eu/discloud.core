"use strict";

import IEntry from "../../interface/entry";

export interface IEntryResponse {
  created: number;
  group: number;
  lastModify: number;
  location: string[];
  name: string;
  owner: number;
  path: string;
  permission: string;
  share: string;
  type: string;
  upload: string;
  uuid: string;
}

export interface IEntryResponseOptions {
  upload?: string;
}

export default class EntryResponse implements IEntryResponse {
  public created: number;
  public group: number;
  public lastModify: number;
  public location: string[];
  public name: string;
  public owner: number;
  public path: string;
  public permission: string;
  public share: string;
  public type: string;
  public upload: string;
  public uuid: string;

  constructor(entry: IEntry, options: IEntryResponseOptions = {}) {
    this.created = entry.created;
    this.group = entry.group;
    this.lastModify = entry.lastModify;
    this.location = entry.location;
    this.owner = entry.owner;
    this.path = entry.path;
    this.permission = entry.permission;
    this.share = entry.share;
    this.type = entry.type;
    this.upload = options.upload;
    this.uuid = entry.uuid;
  }
}
