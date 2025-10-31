// /functions/_utils.js
export function getEmailFromRequest(request) {
  // Cloudflare Access adds this header when the app is gated by Access
  const email = request.headers.get('CF-Access-Authenticated-User-Email');
  return email || null;
}

export async function sha256Hex(text) {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export function okJson(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', ...init.headers }
  });
}

export function badRequest(msg) {
  return new Response(JSON.stringify({ error: msg }), {
    status: 400, headers: { 'content-type': 'application/json' }
  });
}

export function redirect(url) {
  return Response.redirect(url, 302);
}
