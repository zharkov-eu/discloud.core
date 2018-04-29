"use strict";

import CassandraRepository from "../repository/cassandra";

class TreeService {
  private readonly repository: CassandraRepository;

  constructor(repository: CassandraRepository) {
    this.repository = repository;
  }

  public getUserTreeRoot = async (username: string): Promise<string | undefined> => {
    const query = "SELECT uuid FROM tree WHERE username=?";
    return;
  };
}

export default TreeService;
