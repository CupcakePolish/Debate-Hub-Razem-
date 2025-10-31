// functions/api/docs.js

// Klucze w KV_EDITS (globalne, wspólne)
//  - 'docs_index'  -> JSON: { ids: [...] }
//  - 'doc:{id}'    -> obiekt dokumentu { id, title, desc, yt, html, branches, anchors, ownerUserId, ownerUsername, created, updated }

async function getMe(env, request) {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return null;
  const user = await env.KV_USERS.get(`user:${email.toLowerCase()}`, { type: 'json' });
  if (!user) return { userId: email.toLowerCase(), email, username: null };
  return { userId: user.userId || email.toLowerCase(), email, username: user.username || null };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    // lista wszystkich dokumentów (globalny index)
    const idx = (await env.KV_EDITS.get('docs_index', { type: 'json' })) || { ids: [] };
    return json({ ok: true, ids: Array.from(new Set(idx.ids)) });
  } else {
    const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
    if (!doc) return json({ error: 'not_found' }, 404);
    return json(doc);
  }
};

export const onRequestPost = async ({ request, env }) => {
  const me = await getMe(env, request);
  if (!me) return new Response('unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, doc } = body || {};
  if (!id || !doc) return new Response('bad_request', { status: 400 });

  // jeśli dokument nie istnieje, ustaw właściciela
  const existing = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });

  const toSave = {
    id,
    title: doc.title || '',
    desc: doc.desc || '',
    yt: doc.yt || '',
    html: doc.html || '',
    branches: doc.branches || {},
    anchors: doc.anchors || {},
    ownerUserId: existing?.ownerUserId || doc.ownerUserId || me.userId,
    ownerUsername: existing?.ownerUsername || doc.ownerUsername || (me.username || ''),
    created: existing?.created || doc.created || new Date().toISOString(),
    updated: new Date().toISOString(),
  };

  await env.KV_EDITS.put(`doc:${id}`, JSON.stringify(toSave), { metadata: { id } });

  // dopisz do globalnego indeksu
  const idx = (await env.KV_EDITS.get('docs_index', { type: 'json' })) || { ids: [] };
  if (!idx.ids.includes(id)) idx.ids.push(id);
  await env.KV_EDITS.put('docs_index', JSON.stringify(idx));

  return json({ ok: true, id });
};

export const onRequestDelete = async ({ request, env }) => {
  const me = await getMe(env, request);
  if (!me) return new Response('unauthorized', { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return new Response('bad_request', { status: 400 });

  const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
  if (!doc) return new Response('not_found', { status: 404 });

  // kasować może tylko właściciel
  if (doc.ownerUserId && doc.ownerUserId !== me.userId) {
    return new Response('forbidden', { status: 403 });
  }

  await env.KV_EDITS.delete(`doc:${id}`);

  const idx = (await env.KV_EDITS.get('docs_index', { type: 'json' })) || { ids: [] };
  const next = { ids: idx.ids.filter((x) => x !== id) };
  await env.KV_EDITS.put('docs_index', JSON.stringify(next));

  return json({ ok: true });
};
