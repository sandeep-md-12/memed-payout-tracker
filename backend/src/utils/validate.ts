import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates and cleans `req.body` with a Zod schema before the controller runs.
 * A ZodError is thrown on bad input; the error handler turns it into a 400.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}

/** Checks route params (e.g. that `:id` is a valid ObjectId). */
export function validateParams(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    schema.parse(req.params);
    next();
  };
}
