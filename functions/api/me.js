// functions/api/me.js
export const onRequestGet = async ({ request, env }) => {
  const email = request.headers.get("cf-access-authenticated-user-email") || null;
  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: "no_email" }), { status: 401 });
  }
  const userKey = `user:${email.toLowerCase()}`;
  let user = await env.KV_USERS.get(userKey, { type: "json" });
  if (!user) {
    // tymczasowe userId, zanim wybierze username
    user = { email, userId: crypto.randomUUID(), username: null };
    await env.KV_USERS.put(userKey, JSON.stringify(user));
    await env.KV_USERS.put(`userid:${user.userId}`, JSON.stringify({ email, username: null }));
  }
  return new Response(JSON.stringify({ ok: true, email, userId: user.userId, username: user.username }), {
    headers: { "content-type": "application/json" }
  });
};

