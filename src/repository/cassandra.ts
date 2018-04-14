"use strict";

import * as cassandra from "cassandra-driver";

export default class CassandraRepository {
  public readonly client: cassandra.Client;

  constructor() {
    this.client = new cassandra.Client({contactPoints: ["127.0.0.1"], keyspace: "discloud"});
  }
}
