// /functions/_middleware.js
import { getEmailFromRequest, redirect } from './_utils';

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Let these pass
  if (path.startsWith('/cdn-cgi/')) return next();
  if (path.startsWith('/api/')) return next();

  // Try reading email (if not logged in, Zero Trust will challenge)
  let email = null;
  try { email = getEmailFromRequest(request); } catch {}

  if (!email) return next();

  // If logged-in and username not set -> send to /setup
  try {
    if (env.KV_USERS) {
      const rec = await env.KV_USERS.get(`email:${email.toLowerCase()}`, { type: 'json' });
      if (!rec?.username && path !== '/setup') return redirect('/setup');
    }
  } catch {
    // don't crash if KV missing
  }
  return next();
}
