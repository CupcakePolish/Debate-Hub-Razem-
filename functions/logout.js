// /functions/logout.js
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const afterLogin = `${url.origin}/`; // where to go after re-login
  const loginUrl = `/cdn-cgi/access/login?return_to=${encodeURIComponent(afterLogin)}`;
  const target = `/cdn-cgi/access/logout?return_to=${encodeURIComponent(loginUrl)}`;
  return Response.redirect(target, 302);
}
