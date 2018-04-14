"use strict";

import * as restify from "restify";
import {logger, LogType} from "./src/logger";
import CassandraRepository from "./src/repository/cassandra";
import Router from "./src/router";

const server = restify.createServer({
    name: "discloud",
    version: "1.0.0",
});

server.acceptable = ["application/json", "application/octet-stream"];

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser());

(async () => {
    const repository = new CassandraRepository();
    Router(server, repository);

    server.listen(8000, () => {
        logger.info({type: LogType.SYSTEM}, `${server.name} listen on port ${server.url}`);
    });
})();
