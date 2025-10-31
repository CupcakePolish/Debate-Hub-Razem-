// /functions/api/me.js
import { getEmailFromRequest, okJson } from '../_utils';

export async function onRequestGet({ request, env }) {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  const data = await env.KV_USERS.get(`email:${email.toLowerCase()}`, { type: 'json' });
  return okJson({
    email,
    username: data?.username || null
  });
}
