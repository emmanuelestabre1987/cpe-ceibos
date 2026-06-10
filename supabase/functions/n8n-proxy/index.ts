const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS });

  const { webhook_url, payload } = await req.json();
  if (!webhook_url) return new Response(JSON.stringify({ error: "missing webhook_url" }), { status: 400, headers: CORS });

  // Reenviar a n8n (server-side, sin restricciones CORS)
  const res = await fetch(webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((e) => ({ ok: false, status: 500, text: async () => String(e) }));

  const text = await (res as Response).text();
  return new Response(JSON.stringify({ ok: (res as Response).ok, status: (res as Response).status, body: text }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
});
