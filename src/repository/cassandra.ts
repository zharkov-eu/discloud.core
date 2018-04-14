"use strict";

import * as cassandra from "cassandra-driver";

export default class CassandraRepository {
    public readonly client: cassandra.Client;

    constructor() {
        this.client = new cassandra.Client({contactPoints: ["ih665819.dedic.myihor.ru"], keyspace: "test"});
    }
}
