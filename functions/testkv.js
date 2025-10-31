export async function onRequestGet(context) {
  const { DB } = context.env;

  // Store a test key-value pair
  await DB.put("testKey", "Hello from Debate Hub!");

  // Retrieve the stored value
  const value = await DB.get("testKey");

  return new Response(`✅ KV test successful! Value: ${value}`, {
    headers: { "content-type": "text/plain" },
  });
}
