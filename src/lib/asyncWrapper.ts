"use strict";

import * as restify from "restify";
import * as errors from "restify-errors";

const asyncWrapper = (fun) => async (req: restify.Request, res: restify.Response, next: restify.Next) => {
  await fun(req, res, next)
      .catch((err) => {
        if (!(err instanceof errors.HttpError)) {
          err = new errors.InternalServerError(err);
        }
        next(err);
      });
};

export default asyncWrapper;
