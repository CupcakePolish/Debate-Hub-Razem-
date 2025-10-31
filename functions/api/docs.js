// functions/api/docs.js

// Klucze w KV_EDITS (globalne, wspólne)
//  - 'docs_index:global'  -> JSON: { ids: [...] }
//  - 'doc:{id}'    -> obiekt dokumentu { id, title, desc, yt, html, branches, anchors, owner, ownerName, created, updated }

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

const INDEX_KEY = 'docs_index:global';

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    // lista wszystkich dokumentów (globalny index)
    const idx = (await env.KV_EDITS.get(INDEX_KEY, { type: 'json' })) || { ids: [] };
    return json({ ok: true, ids: Array.from(new Set(idx.ids || [])) });
  } else {
    const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
    if (!doc) return json({ error: 'not_found' }, 404);
    return json(doc);
  }
};

export const onRequestPost = async ({ request, env }) => {
  try {
    const me = await getMe(env, request);
    if (!me) return json({ error: 'unauthorized' }, 401);

    const body = await request.json().catch(() => ({}));
    const { id, doc } = body || {};
    if (!id || !doc || typeof doc !== 'object') {
      return json({ error: 'bad_request' }, 400);
    }

    const existing = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });

    const now = new Date().toISOString();
    const toSave = {
      id,
      title: doc.title || '',
      desc: doc.desc || '',
      yt: doc.yt || '',
      html: doc.html || '',
      branches: doc.branches || {},
      comments: doc.comments || {},
      anchors: doc.anchors || {},
      owner: existing?.owner || doc.owner || me.userId,
      ownerName:
        existing?.ownerName || doc.ownerName || me.username || me.email || me.userId,
      created: existing?.created || doc.created || now,
      updated: now,
    };

    await env.KV_EDITS.put(`doc:${id}`, JSON.stringify(toSave), { metadata: { id } });

    const idx = (await env.KV_EDITS.get(INDEX_KEY, { type: 'json' })) || { ids: [] };
    if (!Array.isArray(idx.ids)) idx.ids = [];
    if (!idx.ids.includes(id)) idx.ids.push(id);
    await env.KV_EDITS.put(INDEX_KEY, JSON.stringify(idx));

    return json({ ok: true, id });
  } catch (err) {
    console.error('POST /api/docs failed', err);
    return json({ error: 'server_error' }, 500);
  }
};

export const onRequestDelete = async ({ request, env }) => {
  try {
    const me = await getMe(env, request);
    if (!me) return json({ error: 'unauthorized' }, 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'bad_request' }, 400);

    const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
    if (!doc) return json({ error: 'not_found' }, 404);

    if (doc.owner && doc.owner !== me.userId) {
      return json({ error: 'forbidden' }, 403);
    }

    await env.KV_EDITS.delete(`doc:${id}`);

    const idx = (await env.KV_EDITS.get(INDEX_KEY, { type: 'json' })) || { ids: [] };
    const nextIds = Array.isArray(idx.ids) ? idx.ids.filter((x) => x !== id) : [];
    await env.KV_EDITS.put(INDEX_KEY, JSON.stringify({ ids: nextIds }));

    return json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/docs failed', err);
    return json({ error: 'server_error' }, 500);
  }
};
