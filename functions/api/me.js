export const onRequestGet = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) {
    // Brak Cloudflare Access -> front pokaże overlay dopiero po włączeniu Access
    return new Response(JSON.stringify({ ok: false }), {
      headers: { 'content-type': 'application/json' },
    });
  }

  const userId = email.toLowerCase();
  const rec = await env.KV_USERS.get(`user:${userId}`, { type: 'json' });
  return new Response(
    JSON.stringify({
      ok: true,
      email: userId,
      userId,
      username: rec?.username || null,
    }),
    { headers: { 'content-type': 'application/json' } }
  );
};
