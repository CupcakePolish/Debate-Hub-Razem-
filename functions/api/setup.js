export const onRequestPost = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return new Response('bad_username', { status: 400 });

  const userId = email.toLowerCase();
  const taken = await env.KV_USERS.get(`name:${username}`, { type: 'json' });
  if (taken && taken.userId !== userId) return new Response('taken', { status: 409 });

  await env.KV_USERS.put(`user:${userId}`, JSON.stringify({ userId, email: userId, username }));
  await env.KV_USERS.put(`name:${username}`, JSON.stringify({ userId }));

  return new Response(JSON.stringify({ ok: true, username }), {
    headers: { 'content-type': 'application/json' },
  });
};
