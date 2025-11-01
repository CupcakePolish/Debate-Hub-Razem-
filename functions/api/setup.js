// functions/api/setup.js
import { sha256Hex, badRequest, okJson } from '../_utils.js';

export const onRequestPost = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return badRequest('bad_username');

  const userId = await sha256Hex(`${env.SECRET_SALT}:${email.toLowerCase()}`);

  // Is username already taken by someone else
  const taken = await env.KV_USERS.get(`name:${username}`, { type: 'json' });
  if (taken && taken.userId !== userId) return new Response('taken', { status: 409 });

  // Save mappings
  await env.KV_USERS.put(`user:${userId}`, JSON.stringify({ userId, username }));
  await env.KV_USERS.put(`name:${username}`, JSON.stringify({ userId }));

  return okJson({ ok: true, username });
};
