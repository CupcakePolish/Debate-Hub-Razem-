export async function onRequestGet(context) {
  const { request, env } = context;
  const jwt = request.headers.get("Cf-Access-Jwt-Assertion");

  if (!jwt) {
    return new Response("Missing Access token", { status: 401 });
  }

  // Decode the JWT payload
  const [, payloadB64] = jwt.split(".");
  const payloadJson = JSON.parse(atob(payloadB64));
  const email = payloadJson.email;

  if (!email) {
    return new Response("Email not found in token", { status: 403 });
  }

  // Hash the email
  const hash = await sha256(email);
  const existing = await env.DB.get(hash);

  if (existing) {
    return new Response(JSON.stringify({ pseudonym: existing }), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // First-time visitor — reserve a new record
  await env.DB.put(hash, "");
  return new Response(JSON.stringify({ pseudonym: null }), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// helper to hash email
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}
