/**
 * API versioning constants — must stay in sync with main.ts versioning config:
 *   prefix: 'api/v'
 *   defaultVersion: '1'
 */
export const API_PREFIX = 'api/v';
export const API_VERSION = '1';

/**
 * Pre-built cookie paths scoped to specific routes.
 * Scoping the refresh token cookie to the refresh endpoint
 * ensures the browser only sends it to that path.
 */
export const COOKIE_PATHS = {
  authRefresh: `/${API_PREFIX}${API_VERSION}/auth/refresh`,
} as const;

/** Refresh token cookie max age in milliseconds */
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
