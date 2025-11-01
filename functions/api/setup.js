// functions/api/setup.js
export const onRequestPost = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return new Response('bad_username', { status: 400 });

  const userId = await sha256Hex((env.SECRET_SALT || '') + email.toLowerCase());

  // enforce uniqueness of username
  const taken = await env.KV_USERS.get(`name:${username}`, { type: 'json' });
  if (taken && taken.userId !== userId) return new Response('taken', { status: 409 });

  // store by opaque userId; do NOT store email
  await env.KV_USERS.put(`user:${userId}`, JSON.stringify({ userId, username }));
  await env.KV_USERS.put(`name:${username}`, JSON.stringify({ userId }));

  return new Response(JSON.stringify({ ok: true, userId, username }), {
    headers: { 'content-type': 'application/json' },
  });
};

async function sha256Hex(s) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
