"use strict";

import * as restify from "restify";
import EntryService from "../service/entryService";
import FileService from "../service/fileService";

export default class EntryController {
  private readonly entryService: EntryService;
  private readonly fileService: FileService;

  constructor(entryService: EntryService, fileService: FileService) {
    this.entryService = entryService;
    this.fileService = fileService;
  }

  public get = () => {

  };

  public post = () => {

  };

  public patch = () => {

  };

  public del = () => {

  };
}
