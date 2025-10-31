// functions/api/me.js
export const onRequestGet = async ({ request, env }) => {
  // Cloudflare Access wstrzykuje ten nagłówek po zalogowaniu
  const email = request.headers.get("cf-access-authenticated-user-email") || null;

  // Dla testów lokalnych/bez Access możesz tymczasowo odkomentować „dev”:
  // const email = request.headers.get("cf-access-authenticated-user-email") || "dev@example.com";

  if (!email) {
    return new Response(JSON.stringify({ ok: false, reason: "no_email" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userKey = `user:${email.toLowerCase()}`;
  let user = await env.KV_USERS.get(userKey, { type: "json" });
  if (!user) {
    user = { email, userId: crypto.randomUUID(), username: null };
    await env.KV_USERS.put(userKey, JSON.stringify(user));
    await env.KV_USERS.put(`userid:${user.userId}`, JSON.stringify({ email, username: null }));
  }

  return new Response(
    JSON.stringify({ ok: true, email, userId: user.userId, username: user.username }),
    { headers: { "content-type": "application/json" } }
  );
};
