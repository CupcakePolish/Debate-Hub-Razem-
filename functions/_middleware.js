// /functions/_middleware.js
import { getEmailFromRequest, redirect } from './_utils';

// Run on every request. Keep it crash-proof: never throw.
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Let Pages Functions and static assets pass without checks
  if (path.startsWith('/cdn-cgi/')) return next();
  if (path.startsWith('/api/')) return next();

  // Try to read email from Cloudflare Access header (may be absent)
  let email = null;
  try { email = getEmailFromRequest(request); } catch { /* ignore */ }

  // If not logged in, let Zero Trust Access handle the login challenge
  if (!email) return next();

  // If logged in, ensure username exists in KV; if not, send to /setup
  try {
    if (env.KV_USERS) {
      const rec = await env.KV_USERS.get(`email:${email.toLowerCase()}`, { type: 'json' });
      if (!rec?.username && path !== '/setup') {
        return redirect('/setup');
      }
    }
  } catch {
    // If KV binding is missing or errors, don't block the site
  }

  return next();
}

