// functions/api/docs.js
async function getUser(env, request) {
  const email = request.headers.get("cf-access-authenticated-user-email") || null;
  if (!email) return null;
  return await env.KV_USERS.get(`user:${email.toLowerCase()}`, { type: "json" });
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const me = await getUser(env, request);
  if (!me) return new Response("unauthorized", { status: 401 });

  if (!id) {
    const idxKey = `docs_index:${me.userId}`;
    const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
    return new Response(JSON.stringify({ ok: true, ids: list }), {
      headers: { "content-type": "application/json" },
    });
  } else {
    const docKey = `doc:${me.userId}:${id}`;
    const doc = await env.KV_EDITS.get(docKey, { type: "json" });
    if (!doc) return new Response("not_found", { status: 404 });
    return new Response(JSON.stringify(doc), { headers: { "content-type": "application/json" } });
  }
};

export const onRequestPost = async ({ request, env }) => {
  const me = await getUser(env, request);
  if (!me) return new Response("unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, doc } = body || {};
  if (!id || !doc) return new Response("bad_request", { status: 400 });

  const idxKey = `docs_index:${me.userId}`;
  const docKey = `doc:${me.userId}:${id}`;

  await env.KV_EDITS.put(docKey, JSON.stringify(doc));

  const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
  if (!list.includes(id)) {
    list.push(id);
    await env.KV_EDITS.put(idxKey, JSON.stringify(list));
  }

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};

export const onRequestDelete = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const me = await getUser(env, request);
  if (!me) return new Response("unauthorized", { status: 401 });
  if (!id) return new Response("bad_request", { status: 400 });

  const idxKey = `docs_index:${me.userId}`;
  const docKey = `doc:${me.userId}:${id}`;

  await env.KV_EDITS.delete(docKey);
  const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
  const next = list.filter((x) => x !== id);
  await env.KV_EDITS.put(idxKey, JSON.stringify(next));

  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
