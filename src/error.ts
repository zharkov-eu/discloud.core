"use strict";

export class NodeUnavailableError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ParentPathNotExists extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class EntryTypeError extends Error {
  constructor(message: string) {
    super(message);
  }
}
