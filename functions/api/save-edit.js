// /functions/api/save-edit.js
import { getEmailFromRequest, okJson, badRequest } from '../_utils';

export async function onRequestPost({ request, env }) {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  let body;
  try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }

  const { docId, change } = body || {};
  if (!docId || !change) return badRequest('docId and change are required');

  const user = await env.KV_USERS.get(`email:${email.toLowerCase()}`, { type: 'json' });
  if (!user?.username) return badRequest('Username not set');

  const ts = Date.now();
  const key = `edits:${docId}:${ts}`;
  const record = { ts, docId, user: user.username, email, change };
  await env.KV_EDITS.put(key, JSON.stringify(record));

  return okJson({ ok: true, key });
}
