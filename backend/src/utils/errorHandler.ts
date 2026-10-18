import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { ErrorCode } from './constants';
import { AppError } from './exceptions';
import { sendError } from './response';

export const notFoundHandler: RequestHandler = (req, res) => {
  sendError(res, 404, ErrorCode.ROUTE_NOT_FOUND, `No route for ${req.method} ${req.path}`);
};

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: unknown }).code === 11000;
}

function isJsonParseError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: unknown }).type === 'entity.parse.failed';
}

function isPayloadTooLargeError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { type?: unknown }).type === 'entity.too.large';
}

/**
 * The single place errors become HTTP responses. Express 5 forwards rejected promises from
 * async handlers here, so controllers and services just throw.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Some fields are invalid', details);
    return;
  }
  if (isJsonParseError(err)) {
    sendError(res, 400, ErrorCode.INVALID_JSON, 'Request body is not valid JSON');
    return;
  }
  if (isPayloadTooLargeError(err)) {
    sendError(res, 413, ErrorCode.PAYLOAD_TOO_LARGE, 'Request body is too large');
    return;
  }
  if (err instanceof mongoose.Error.CastError) {
    sendError(res, 400, ErrorCode.VALIDATION_ERROR, `Invalid ${err.path}`);
    return;
  }
  if (isDuplicateKeyError(err)) {
    // Backstop for races the services' own duplicate checks can't see (two requests at once).
    sendError(res, 409, ErrorCode.ALREADY_EXISTS, 'This record already exists');
    return;
  }
  console.error('Unhandled error:', err);
  sendError(res, 500, ErrorCode.INTERNAL_ERROR, 'Something went wrong on our side');
};
