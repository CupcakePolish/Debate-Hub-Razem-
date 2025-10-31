// /functions/setup.js
import { getEmailFromRequest, sha256Hex, redirect } from './_utils';

const USERNAME_REGEX = /^[a-z0-9_]{3,24}$/i;
const RESERVED = new Set(['admin','owner','root','system','setup','login','logout','api','upload','files']);

export async function onRequestGet({ request, env }) {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  const existing = await env.KV_USERS.get(`email:${email.toLowerCase()}`, { type: 'json' });
  if (existing?.username) return redirect('/');

  const html = `
<!doctype html>
<meta charset="utf-8">
<title>Choose username</title>
<style>
  body{font-family:system-ui,Segoe UI,Arial;padding:24px;max-width:680px;margin:auto}
  form{display:flex;gap:12px}
  input{padding:10px;font-size:16px}
  button{padding:10px 14px;font-size:16px}
  .hint{color:#555;margin-top:8px}
</style>
<h1>Choose your username</h1>
<p>This will be tied to <b>${email}</b> and shown with your edits.</p>
<form method="post">
  <input name="username" placeholder="username" autocomplete="off" required>
  <button type="submit">Save</button>
</form>
<p class="hint">Rules: 3–24 characters, letters, numbers, underscore.</p>
`;
  return new Response(html, { headers: { 'content-type':'text/html; charset=utf-8' } });
}

export async function onRequestPost({ request, env }) {
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  const form = await request.formData();
  const rawUsername = (form.get('username') || '').trim();
  const username = rawUsername.toLowerCase();

  if (!USERNAME_REGEX.test(username) || RESERVED.has(username)) {
    return new Response('Invalid username. Use 3–24 letters, numbers, underscore.', { status: 400 });
  }

  // Is username taken?
  const taken = await env.KV_USERS.get(`username:${username}`);
  if (taken) {
    return new Response('That username is already taken. Choose another.', { status: 409 });
  }

  // Save both mappings atomically-ish
  const emailKey = `email:${email.toLowerCase()}`;
  const now = new Date().toISOString();
  await env.KV_USERS.put(emailKey, JSON.stringify({ username, email, createdAt: now }));

  await env.KV_USERS.put(`username:${username}`, email.toLowerCase());

  // Also a stable userId based on email hash (for file prefixes etc.)
  const userId = await sha256Hex(email.toLowerCase());
  await env.KV_USERS.put(`userid:${email.toLowerCase()}`, userId);

  return redirect('/');
}
