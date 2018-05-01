"use strict";

export enum EntryType {
  FILE = "f",
  DIRECTORY = "d",
}

export enum EntryShare {
  LINK = "link",
}

export default interface IEntry {
  uuid: string; // UUID v4 (part of composite key)
  username: string; // Username Drive (part of composite key)
  name: string; // Entry Name
  type: EntryType; // Entry type
  filetype?: string; // File Type
  parent: string; // Parent UUID
  child?: string[]; // Child UUIDs (Only if type = EntryType.DIRECTORY)
  path: string; // Path representation
  owner: number; // Entry owner ID
  group: number; // Entry group ID
  permission: string; // Entry permission (UNIX-like, ex: 644)
  share?: EntryShare; // Entry share status, set only if entry have one of shared type
  created: number; // Entry created timestamp
  last_modify: number; // Entry last modify timestamp
  location: string[]; // Nodes of physical content location
  locationPath: string; // Physical location on nodes
}
