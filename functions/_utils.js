// functions/_utils.js

// Read user email from Cloudflare Access header
export function getEmailFromRequest(request) {
  // Cloudflare sets this when the route is protected by Access
  const email = request.headers.get('cf-access-authenticated-user-email');
  return email || null;
}

// Stable hex SHA-256 helper
export async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// JSON helpers
export function okJson(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) }
  });
}
export function badRequest(msg = 'bad_request') {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { 'content-type': 'application/json' }
  });
}
export function redirect(url) {
  return Response.redirect(url, 302);
}
