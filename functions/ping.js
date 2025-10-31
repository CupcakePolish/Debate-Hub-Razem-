// functions/ping.js
export const onRequestGet = () => {
  return new Response(JSON.stringify({ ok: true, pong: true }), {
    headers: { "content-type": "application/json" },
  });
};
