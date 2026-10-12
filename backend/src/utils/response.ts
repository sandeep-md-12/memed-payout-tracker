import type { Response } from 'express';

export interface SuccessBody<T> {
  status: 'success';
  statusCode: number;
  message: string;
  data: T;
}

export interface ErrorBody {
  status: 'error';
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
}

export function sendSuccess<T>(res: Response, data: T, message: string, statusCode = 200): void {
  const body: SuccessBody<T> = { status: 'success', statusCode, message, data };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): void {
  const body: ErrorBody = { status: 'error', statusCode, code, message };
  if (details !== undefined) body.details = details;
  res.status(statusCode).json(body);
}
