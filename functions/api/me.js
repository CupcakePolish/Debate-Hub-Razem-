// functions/api/me.js
function json(d, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestGet = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return json({ ok: false }, 401);

  const key = `user:${email.toLowerCase()}`;
  const u = (await env.KV_USERS.get(key, { type: 'json' })) || null;

  return json({
    ok: true,
    email: email.toLowerCase(),
    userId: u?.userId || email.toLowerCase(),
    username: u?.username || null,
  });
};
