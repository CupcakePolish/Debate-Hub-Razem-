// functions/api/me.js
import { sha256Hex, okJson } from '../_utils.js';

export const onRequestGet = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return new Response(JSON.stringify({ ok: false }), { status: 401 });

  const emailLower = email.toLowerCase();
  const userId = await sha256Hex(`${env.SECRET_SALT}:${emailLower}`);

  // Migration - if old key existed, move it to the new key once
  const oldUserKey = `user:${emailLower}`;
  const oldUser = await env.KV_USERS.get(oldUserKey, { type: 'json' });
  if (oldUser && !await env.KV_USERS.get(`user:${userId}`)) {
    await env.KV_USERS.put(`user:${userId}`, JSON.stringify({ userId, username: oldUser.username || null }));
    await env.KV_USERS.delete(oldUserKey);
  }

  const user = await env.KV_USERS.get(`user:${userId}`, { type: 'json' });

  return okJson({
    ok: true,
    userId,
    username: user?.username || null
  });
};
