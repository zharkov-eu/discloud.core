"use strict";

import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "./abstractEntryService";

export default class SlaveEntryService extends AbstractEntryService {
  constructor(repository: CassandraRepository) {
    super(repository);
  }
}
