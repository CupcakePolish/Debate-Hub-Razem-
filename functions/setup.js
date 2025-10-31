function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestPost = async ({ request, env }) => {
  // Wymaga Cloudflare Access (email w nagłówku)
  const email =
    request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return new Response('bad_username', { status: 400 });
  }

  const userId = email.toLowerCase();

  // Czy nazwa już zajęta przez kogoś innego?
  const taken = await env.KV_USERS.get(`name:${username}`, { type: 'json' });
  if (taken && taken.userId !== userId) {
    return new Response('taken', { status: 409 });
  }

  // Zapis/aktualizacja profilu użytkownika
  await env.KV_USERS.put(
    `user:${userId}`,
    JSON.stringify({ userId, email: userId, username })
  );

  // Rezerwacja nazwy -> mapowanie name -> userId
  await env.KV_USERS.put(`name:${username}`, JSON.stringify({ userId }));

  return json({ ok: true, username });
};

// (opcjonalnie) odrzucamy inne metody elegancko
export const onRequest = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response('method_not_allowed', { status: 405 });
  }
};
