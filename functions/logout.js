// /functions/logout.js
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const base = `${url.protocol}//${url.host}`;

  // Cloudflare Access logout endpoint on the SAME application host
  const target = `/cdn-cgi/access/logout?returnTo=${encodeURIComponent(base)}`;

  // 302 redirect to Access logout
  return Response.redirect(target, 302);
}
