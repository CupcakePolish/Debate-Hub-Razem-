// functions/api/docs.js
// Wspólny (globalny) indeks dokumentów, widoczny dla wszystkich zalogowanych przez Access.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

// Pobranie emaila z nagłówka Access (wymagamy zalogowania, ale NIE dzielimy danych po użytkowniku)
async function getUser(request, env) {
  const email = request.headers.get('cf-access-authenticated-user-email') || null;
  if (!email) return null;
  // opcjonalnie można doczytać username z KV_USERS, ale nie jest potrzebne do samego dostępu
  return { email, userId: email.toLowerCase() };
}

export const onRequestGet = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const me = await getUser(request, env);
  if (!me) return new Response("unauthorized", { status: 401 });

  const idxKey = "docs_index"; // <<< GLOBAL
  if (!id) {
    const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
    return json({ ok: true, ids: list });
  } else {
    const docKey = `docs:${id}`;
    const doc = await env.KV_EDITS.get(docKey, { type: "json" });
    if (!doc) return new Response("not_found", { status: 404 });
    return json(doc);
  }
};

export const onRequestPost = async ({ request, env }) => {
  const me = await getUser(request, env);
  if (!me) return new Response("unauthorized", { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { id, doc } = body || {};
  if (!id || !doc) return new Response("bad_request", { status: 400 });

  const idxKey = "docs_index"; // <<< GLOBAL
  const docKey = `docs:${id}`;

  // zapisz dokument
  await env.KV_EDITS.put(docKey, JSON.stringify(doc));

  // dopisz do indeksu (unikalnie)
  const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
  if (!list.includes(id)) {
    list.push(id);
    await env.KV_EDITS.put(idxKey, JSON.stringify(list));
  }

  return json({ ok: true });
};

export const onRequestDelete = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const me = await getUser(request, env);
  if (!me) return new Response("unauthorized", { status: 401 });

  if (!id) return new Response("bad_request", { status: 400 });

  const idxKey = "docs_index"; // <<< GLOBAL
  const docKey = `docs:${id}`;

  // usuń dokument
  await env.KV_EDITS.delete(docKey);

  // usuń z indeksu
  const list = (await env.KV_EDITS.get(idxKey, { type: "json" })) || [];
  const next = list.filter(x => x !== id);
  if (next.length !== list.length) {
    await env.KV_EDITS.put(idxKey, JSON.stringify(next));
  }

  return json({ ok: true });
};
