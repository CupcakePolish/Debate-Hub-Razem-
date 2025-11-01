// functions/api/me.js
function json(d, s = 200) {
  return new Response(JSON.stringify(d), {
    status: s,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestGet = async ({ request, env }) => {
  const email = request.headers.get('cf-access-authenticated-user-email');
  if (!email) return json({ ok: false }, 401);

  // Opaque stable ID -> SHA-256(SECRET_SALT + email)
  const userId = await sha256Hex((env.SECRET_SALT || '') + email.toLowerCase());

  // Read username stored under the new key
  const key = `user:${userId}`;
  const u = (await env.KV_USERS.get(key, { type: 'json' })) || null;

  // Never return email
  return json({
    ok: true,
    userId,
    username: u?.username || null,
  });
};

async function sha256Hex(s) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
