export const ROLES = ['brand', 'creator'] as const;
export type Role = (typeof ROLES)[number];

export const PLATFORMS = ['instagram', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
};

export const SUBMISSION_STATUSES = ['active', 'flagged', 'rejected'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Machine-readable error codes returned in every error response's `code` field. */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  CAMPAIGN_NOT_FOUND: 'CAMPAIGN_NOT_FOUND',
  CAMPAIGN_NOT_LIVE: 'CAMPAIGN_NOT_LIVE',
  INVALID_POST_URL: 'INVALID_POST_URL',
  PLATFORM_MISMATCH: 'PLATFORM_MISMATCH',
  POST_ALREADY_SUBMITTED: 'POST_ALREADY_SUBMITTED',
  SUBMISSION_NOT_FOUND: 'SUBMISSION_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Success messages, kept in one place like the error codes. */
export const Messages = {
  SIGNUP_SUCCESS: 'Account created',
  LOGIN_SUCCESS: 'Logged in',
  CURRENT_USER: 'Current user',
  HEALTH_OK: 'API is healthy',
  CAMPAIGN_CREATED: 'Campaign created',
  CAMPAIGNS_RETRIEVED: 'Campaigns retrieved',
  SUBMISSION_CREATED: 'Post submitted',
  SUBMISSIONS_RETRIEVED: 'Submissions retrieved',
  EARNINGS_RETRIEVED: 'Earnings retrieved',
} as const;
