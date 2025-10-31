// functions/api/setup.js
export const onRequestPost = async ({ request, env }) => {
  const email = request.headers.get("cf-access-authenticated-user-email") || null;
  if (!email) return new Response("unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  let { username } = body || {};
  if (!username || typeof username !== "string") return new Response("bad username", { status: 400 });
  username = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return new Response("invalid_format", { status: 400 });

  // unikalność
  const taken = await env.KV_USERS.get(`username:${username}`);
  if (taken) return new Response("taken", { status: 409 });

  const userKey = `user:${email.toLowerCase()}`;
  const user = await env.KV_USERS.get(userKey, { type: "json" });
  if (!user) return new Response("no_user", { status: 404 });

  if (user.username) await env.KV_USERS.delete(`username:${user.username}`);

  user.username = username;
  await env.KV_USERS.put(userKey, JSON.stringify(user));
  await env.KV_USERS.put(`username:${username}`, JSON.stringify({ email: user.email, userId: user.userId }));
  await env.KV_USERS.put(`userid:${user.userId}`, JSON.stringify({ email: user.email, username }));

  return new Response(JSON.stringify({ ok: true, username }), {
    headers: { "content-type": "application/json" },
  });
};
