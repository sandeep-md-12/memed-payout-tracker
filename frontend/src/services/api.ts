import type {
  AuthResult,
  Campaign,
  Earnings,
  NewCampaign,
  PayoutEntry,
  PayoutResult,
  Role,
  Submission,
  User,
} from './types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');

/** An error response from the API, or a network failure (status 0). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/** Called by AuthContext whenever the session changes. */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/** Called when a logged-in request comes back 401 (token expired or revoked). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const tokenSent = authToken;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(tokenSent && { Authorization: `Bearer ${tokenSent}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status !== 'success') {
    if (response.status === 401 && tokenSent) onUnauthorized?.();
    throw new ApiError(
      response.status,
      payload?.code ?? 'UNKNOWN_ERROR',
      payload?.message ?? `Request failed (${response.status})`,
      payload?.details,
    );
  }
  return payload.data as T;
}

export const authApi = {
  signup: (input: { name: string; email: string; password: string; role: Role }) =>
    request<AuthResult>('POST', '/auth/signup', input),
  login: (input: { email: string; password: string }) => request<AuthResult>('POST', '/auth/login', input),
  me: () => request<User>('GET', '/auth/me'),
};

export const campaignApi = {
  create: (input: NewCampaign) => request<Campaign>('POST', '/campaigns', input),
  listMine: () => request<Campaign[]>('GET', '/campaigns/mine'),
  listLive: () => request<Campaign[]>('GET', '/campaigns'),
  submissions: (campaignId: string) => request<Submission[]>('GET', `/campaigns/${campaignId}/submissions`),
  payouts: (campaignId: string) => request<PayoutEntry[]>('GET', `/campaigns/${campaignId}/payouts`),
};

export const submissionApi = {
  submit: (campaignId: string, postUrl: string) =>
    request<Submission>('POST', `/campaigns/${campaignId}/submissions`, { postUrl }),
  listMine: () => request<Submission[]>('GET', '/submissions/mine'),
  /** Simulated platform data: no login needed. */
  updateViews: (submissionId: string, views: number) =>
    request<PayoutResult>('PATCH', `/submissions/${submissionId}/views`, { views }),
  approve: (submissionId: string) => request<PayoutResult>('POST', `/submissions/${submissionId}/approve`),
  reject: (submissionId: string) => request<PayoutResult>('POST', `/submissions/${submissionId}/reject`),
  payouts: (submissionId: string) => request<PayoutEntry[]>('GET', `/submissions/${submissionId}/payouts`),
};

export const creatorApi = {
  earnings: () => request<Earnings>('GET', '/creators/me/earnings'),
};

/** A message fit to show the user, whatever was thrown. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const firstDetail = err.details?.[0]?.message;
    return firstDetail && err.code === 'VALIDATION_ERROR' ? firstDetail : err.message;
  }
  return 'Something went wrong. Please try again.';
}
