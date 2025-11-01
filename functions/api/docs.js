// functions/api/docs.js
//
// KV_EDITS keys (global, shared)
//  - 'docs_index:global'  -> JSON: { ids: [...] }
//  - 'doc:{id}'           -> object { id, title, desc, yt, html, branches, anchors, owner, ownerName, created, updated }
//
// Notes:
//  * We NEVER store or return emails here.
//  * Owners are stored as a salted hash userId (u_<sha256(...)[0:32]>).
//  * Legacy docs that still have email as owner are accepted for permission
//    and migrated to hashed owner on next save.

import { sha256Hex, getEmailFromRequest } from '../_utils.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const INDEX_KEY = 'docs_index:global';

// -------------------------------------------------------------
// Current user (non-PII). Must MATCH the hashing used in /api/me.
// -------------------------------------------------------------
async function getMe(env, request) {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return null;

  const userId =
    'u_' + (await sha256Hex(email.toLowerCase() + (env.SECRET_SALT || 'static-fallback'))).slice(0, 32);

  // Username is stored under userId, not email
  const u = await env.KV_USERS.get(`user:${userId}`, { type: 'json' });
  return { userId, username: u?.username || null };
}

// -------------------------------------------------------------
// Permission: can the current request modify this doc?
// Accepts both new hashed owner and legacy email owner.
// -------------------------------------------------------------
async function canWriteDoc(request, env, doc) {
  const email = getEmailFromRequest(request);
  if (!email) return false;

  const newId =
    'u_' + (await sha256Hex(email.toLowerCase() + (env.SECRET_SALT || 'static-fallback'))).slice(0, 32);

  // direct match (new format)
  if (doc.owner === newId || doc.ownerUserId === newId) return true;

  // legacy: owner stored as plain email
  if (doc.owner && typeof doc.owner === 'string' && doc.owner.includes('@')) {
    const legacyHash =
      'u_' + (await sha256Hex(doc.owner.toLowerCase() + (env.SECRET_SALT || 'static-fallback'))).slice(0, 32);
    if (legacyHash === newId) return true;
  }

  return false;
}

// -------------------------------------------------------------
// GET: list docs (no id) or return a doc (with id)
// -------------------------------------------------------------
export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    const idx = (await env.KV_EDITS.get(INDEX_KEY, { type: 'json' })) || { ids: [] };
    return json({ ok: true, ids: Array.from(new Set(idx.ids || [])) });
  } else {
    const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
    if (!doc) return json({ error: 'not_found' }, 404);
    return json(doc);
  }
};

// -------------------------------------------------------------
// POST: create/update doc (enforces permissions + migrates owner)
// -------------------------------------------------------------
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

    // If updating an existing doc, verify permission (accept legacy owner too)
    if (existing) {
      const allowed = await canWriteDoc(request, env, existing);
      if (!allowed) return json({ error: 'forbidden' }, 403);
    }

    // Work out canonical owner
    // - new doc → owner = me.userId
    // - existing:
    //     * if legacy email owner → migrate to hashed owner
    //     * else keep existing owner
    let owner = me.userId;
    if (existing?.owner) {
      owner = existing.owner;
      if (typeof existing.owner === 'string' && existing.owner.includes('@')) {
        owner = me.userId; // migrate legacy email owner to hashed id
      }
    }

    const now = new Date().toISOString();
    const toSave = {
      id,
      title: doc.title || existing?.title || '',
      desc: doc.desc || existing?.desc || '',
      yt: doc.yt || existing?.yt || '',
      html: doc.html || existing?.html || '',
      branches: doc.branches || existing?.branches || {},
      comments: doc.comments || existing?.comments || {},
      anchors: doc.anchors || existing?.anchors || {},

      // Canonical owner (no PII)
      owner,
      ownerUserId: owner,

      // Display-only name; never fallback to email
      ownerName: existing?.ownerName || doc.ownerName || me.username || '',

      created: existing?.created || doc.created || now,
      updated: now,
    };

    await env.KV_EDITS.put(`doc:${id}`, JSON.stringify(toSave), { metadata: { id } });

    // Maintain index
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

// -------------------------------------------------------------
// DELETE: remove doc (enforces permissions)
// -------------------------------------------------------------
export const onRequestDelete = async ({ request, env }) => {
  try {
    const me = await getMe(env, request);
    if (!me) return json({ error: 'unauthorized' }, 401);

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (!id) return json({ error: 'bad_request' }, 400);

    const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
    if (!doc) return json({ error: 'not_found' }, 404);

    const allowed = await canWriteDoc(request, env, doc);
    if (!allowed) return json({ error: 'forbidden' }, 403);

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
