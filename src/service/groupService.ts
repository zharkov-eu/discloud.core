"use strict";

import {IGroupRequest} from "../controller/request/groupRequest";
import IGroup from "../interface/group";
import CassandraRepository from "../repository/cassandra";

export default class GroupService {
  private static convertRow(row: { [key: string]: any }): IGroup {
    return {
      id: row.id,
      name: row.name,
      system: row.system,
    };
  }

  private readonly repository: CassandraRepository;

  constructor(repository: CassandraRepository) {
    this.repository = repository;
  }

  public async findAll(): Promise<IGroup[]> {
    const query = "SELECT * FROM group;";
    const result = await this.repository.client.execute(query, [], {prepare: true});
    if (result.rowLength === 0) {
      return [];
    }
    return result.rows.map(row => GroupService.convertRow(row));
  }

  public async findById(id: number): Promise<IGroup> {
    const query = "SELECT * FROM group WHERE id=?;";
    const result = await this.repository.client.execute(query, [id], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return GroupService.convertRow(result.first());
  }

  public async findByName(name: string): Promise<IGroup> {
    const query = "SELECT * FROM group WHERE name=?;";
    const result = await this.repository.client.execute(query, [name], {prepare: true});
    if (result.rowLength === 0) {
      return undefined;
    }
    return GroupService.convertRow(result.first());
  }

  public async save(groupRequest: IGroupRequest): Promise<IGroup> {
    await this.repository.client.execute("UPDATE counters SET counter_value = counter_value + 1 WHERE type='group';");
    const idResult = await this.repository.client.execute("SELECT counter_value FROM counters WHERE type='group';");

    const group: IGroup = {
      id: idResult.first().counter_value,
      name: groupRequest.name,
      system: groupRequest.system,
    };

    const query = "INSERT INTO group (id, name, system) VALUES (?,?,?);";
    await this.repository.client.execute(query,
        [group.id, group.name, group.system],
        {prepare: true},
    );

    return group;
  }

  public async update(id: number, groupRequest: IGroupRequest): Promise<IGroup> {
    let updateKeys = Object.keys(groupRequest);
    const updateValues = [];
    for (const key of Object.keys(groupRequest)) {
      if (groupRequest[key] === undefined) updateKeys = updateKeys.filter((exKey) => exKey !== key);
      else updateValues.push(groupRequest[key]);
    }
    const setQuery = updateKeys.map((key) => key + " = ?").join(", ");
    const query = `UPDATE group SET ${setQuery} WHERE id = ?;`;

    await this.repository.client.execute(query,
        [...updateValues, id],
        {prepare: true},
    );
    return this.findById(id);
  }

  public async delete(id: number): Promise<void> {
    const query = "DELETE FROM group WHERE id=?;";
    await this.repository.client.execute(query, [id], {prepare: true});
  }
}
