"use strict";

import * as bunyan from "bunyan";

export enum LogType {
    SYSTEM = "SYSTEM",
}

export const logger = bunyan.createLogger({
    name: "main",
    streams: [
        {
            level: bunyan.DEBUG,
            stream: process.stdout,
        },
        {
            level: bunyan.ERROR,
            stream: process.stderr,
        },
    ],
});
