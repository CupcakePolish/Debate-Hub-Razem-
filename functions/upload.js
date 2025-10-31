// /functions/upload.js
import { getEmailFromRequest, badRequest, okJson, sha256Hex } from './_utils';

export async function onRequestPost({ request, env }) {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return badRequest('Missing file');

  const userId = (await env.KV_USERS.get(`userid:${email.toLowerCase()}`)) || await sha256Hex(email.toLowerCase());
  if (!userId) return badRequest('No userId');

  const ts = Date.now();
  const safeName = file.name.replace(/[^\w.\-]/g,'_').slice(-100);
  const key = `${userId}/${ts}-${safeName}`;

  await env.R2_FILES.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' }
  });

  return okJson({ ok: true, key, url: `/files/${encodeURIComponent(key)}` });
}

export async function onRequestGet({ request, env }) {
  // Optional simple GET to read a file: /upload?key=<key>
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return badRequest('key required');
  const obj = await env.R2_FILES.get(key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: { 'content-type': obj.httpMetadata?.contentType || 'application/octet-stream' }});
}
