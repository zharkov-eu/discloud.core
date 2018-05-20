"use strict";

import * as restify from "restify";
import {NotFoundError, UnprocessableEntityError} from "restify-errors";
import LocationStatus from "../interface/locationStatus";
import CassandraRepository from "../repository/cassandra";
import AbstractEntryService from "../service/abstractEntryService";

interface IEntity {
  uuid: string;
  location: string[];
}

const convertRow = (row: { [key: string]: any }): IEntity => {
  return {
    location: row.location,
    uuid: row.uuid,
  };
};

const uploadMiddleware = (repository: CassandraRepository) =>
    async (req: restify.Request, res: restify.Response, next: restify.Next) => {
      try {
        const splitPath = req.getUrl().path.split("/");
        if (splitPath[1] === "upload") {
          const id = parseInt(splitPath[2], 10);
          const uuid = splitPath[3];

          const userQuery = "SELECT id, username FROM user WHERE id = ?";
          const userResultSet = await repository.client.execute(userQuery, [id], {prepare: true});
          if (!userResultSet.first()) {
            return next(new NotFoundError("User with id '{" + id + "}' not found"));
          }

          const entryQuery = `SELECT uuid, location FROM entry_${id} WHERE uuid = ?`;
          const entryResultSet = await repository.client.execute(entryQuery, [uuid], {prepare: true});
          if (!entryResultSet.first()) {
            return next(new NotFoundError("Upload with '{" + uuid + "}' not found"));
          }
          const entity: IEntity = convertRow(entryResultSet.first());
          const locationNonReserved = entity.location.map(it => AbstractEntryService.extendLocation(it))
              .filter(it => it.status !== LocationStatus.RESERVED);
          if (locationNonReserved.length) {
            return next(new UnprocessableEntityError("In locations %s status is not RESERVED",
                JSON.stringify(locationNonReserved)));
          }
        }
        return next();
      } catch (e) {
        next(e);
      }
    };

export default uploadMiddleware;
