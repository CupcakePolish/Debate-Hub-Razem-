// /functions/logout.js
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const returnTo = `${url.origin}/`; // go to home after logout
  const target = `/cdn-cgi/access/logout?return_to=${encodeURIComponent(returnTo)}`;
  return Response.redirect(target, 302);
}
