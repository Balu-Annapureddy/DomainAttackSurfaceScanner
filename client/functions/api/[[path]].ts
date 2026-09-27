/**
 * Cloudflare Pages Functions Reverse Proxy for /api/* (client workspace location)
 *
 * Re-exports the root reverse proxy handler to guarantee deployment compatibility
 * whether Cloudflare Pages root directory is set to repository root or /client.
 */

export {
  handleApiProxy,
  onRequest,
  sanitizeSetCookie,
  extractSetCookies,
  DEFAULT_BACKEND_URL,
} from '../../../functions/api/[[path]]';

export type { Env, EventContext, PagesFunction } from '../../../functions/api/[[path]]';
