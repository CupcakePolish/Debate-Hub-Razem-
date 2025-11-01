// functions/api/me.js
import { getEmailFromRequest, sha256Hex, okJson } from '../_utils.js';

export const onRequestGet = async ({ request, env }) => {
  const email = getEmailFromRequest(request);
  if (!email) return new Response(JSON.stringify({ ok: false }), { status: 401 });

  const userId = 'u_' + (await sha256Hex(email + (env.SECRET_SALT || 'static-fallback'))).slice(0, 32);

  // try to read username record keyed by userId
  const u = (await env.KV_USERS.get(`user:${userId}`, { type: 'json' })) || null;

  return okJson({
    ok: true,
    userId,
    username: u?.username || null,
  });
};
