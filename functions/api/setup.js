// functions/api/setup.js
import { getEmailFromRequest, sha256Hex } from '../_utils.js';

export const onRequestPost = async ({ request, env }) => {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return new Response('bad_username', { status: 400 });
  }

  const userId = 'u_' + (await sha256Hex(email + (env.SECRET_SALT || 'static-fallback'))).slice(0, 32);

  // enforce unique username
  const taken = await env.KV_USERS.get(`name:${username}`, { type: 'json' });
  if (taken && taken.userId !== userId) {
    return new Response('taken', { status: 409 });
  }

  await env.KV_USERS.put(`user:${userId}`, JSON.stringify({ userId, username }), {});
  await env.KV_USERS.put(`name:${username}`, JSON.stringify({ userId }), {});

  return new Response(JSON.stringify({ ok: true, username }), {
    headers: { 'content-type': 'application/json' },
  });
};
