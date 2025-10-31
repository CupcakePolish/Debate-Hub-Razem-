// /functions/_middleware.js
import { getEmailFromRequest } from './_utils';

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Allow Access endpoints and auth routes through
  if (path.startsWith('/cdn-cgi/') || path === '/setup' || path === '/logout' || path === '/login') {
    return next();
  }

  // Require Access-authenticated email
  const email = getEmailFromRequest(request);
  if (!email) {
    // Not authenticated yet, let Cloudflare Access handle redirect
    return next();
  }

  // Check if user already picked a username
  const userKey = `email:${email.toLowerCase()}`;
  const existing = await env.KV_USERS.get(userKey);
  if (!existing) {
    return Response.redirect('/setup', 302);
  }

  return next();
}
