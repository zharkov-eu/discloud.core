"use strict";

import * as restify from "restify";
import {NotFoundError, UnprocessableEntityError} from "restify-errors";
import LocationStatus from "../interface/locationStatus";
import CassandraRepository from "../repository/cassandra";
import EntryService from "../service/entryService";

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
          const query = `SELECT uuid, location FROM entry_${id} WHERE uuid = ?`;
          const resultSet = await repository.client.execute(query, [uuid], {prepare: true});
          if (!resultSet.first()) {
            return next(new NotFoundError("Upload with '{" + uuid + "}' not found"));
          }
          const entity: IEntity = convertRow(resultSet.first());
          const locationNonReserved = entity.location.map(it => EntryService.extendLocation(it))
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
