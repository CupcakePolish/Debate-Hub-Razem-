// /functions/api/docs.js
import { getEmailFromRequest, okJson, badRequest } from '../_utils';

// Keys in KV_EDITS:
//   doc:<id>           -> JSON document
// We will list with prefix "doc:" to discover docs.

export async function onRequest({ request, env }) {
  const method = request.method;

  // Make sure request is authenticated (has email)
  const email = getEmailFromRequest(request);
  if (!email) return new Response('Unauthorized', { status: 401 });

  if (!env.KV_EDITS) return new Response('KV not bound', { status: 500 });

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (method === 'GET') {
    if (id) {
      const doc = await env.KV_EDITS.get(`doc:${id}`, { type: 'json' });
      if (!doc) return new Response('Not found', { status: 404 });
      return okJson(doc);
    } else {
      const items = [];
      let cursor;
      do {
        const page = await env.KV_EDITS.list({ prefix: 'doc:', cursor });
        for (const k of page.keys) {
          items.push(k.name.slice(4)); // strip "doc:"
        }
        cursor = page.cursor;
      } while (cursor);
      return okJson({ ids: items });
    }
  }

  if (method === 'POST') {
    let body;
    try { body = await request.json(); } catch { return badRequest('Invalid JSON'); }
    const { id: docId, doc } = body || {};
    if (!docId || !doc) return badRequest('id and doc required');
    await env.KV_EDITS.put(`doc:${docId}`, JSON.stringify(doc));
    return okJson({ ok: true, id: docId });
  }

  if (method === 'DELETE') {
    if (!id) return badRequest('id required');
    await env.KV_EDITS.delete(`doc:${id}`);
    return okJson({ ok: true, id });
  }

  return new Response('Method not allowed', { status: 405 });
}
