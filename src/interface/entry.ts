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
  parent: string; // Parent UUID
  child?: string[]; // Child UUIDs (Only if type = EntryType.DIRECTORY)
  path: string; // Path representation
  owner: string; // Entry owner
  group: string; // Entry group
  permission: string; // Entry permission (UNIX-like, ex: 644)
  share?: EntryShare; // Entry share status, set only if entry have one of shared type
  location: string[]; // Nodes of physical content location
  locationPath: string; // Physical location on nodes
}
