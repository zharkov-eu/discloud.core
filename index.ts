"use strict";

import {Arguments, IPropertyDefinition} from "cli-args-parser/app/cli";
import {init} from "./boot";

const debugMode: IPropertyDefinition = {
  Description: "debug mode",
  Modifier: "--",
  Name: "debug",
  Required: false,
  Type: "exist",
};

const applicationPort: IPropertyDefinition = {
  Description: "application port",
  Modifier: "--",
  Name: "port",
  Required: false,
  Type: "integer",
};

const args = new Arguments({properties: [debugMode, applicationPort]}).parseProperties();

init({
  debug: args.debug ? args.debug.Value : undefined,
  port: args.port ? args.port.Value : undefined,
});
