import { storedRequest } from './cloud-state.mjs';
const endpoints = new Set(['/health', '/session', '/lobby', '/poll', '/create', '/join', '/action', '/deal', '/gift', '/leave', '/bots']);
const readPaths = new Set(['/health', '/lobby', '/poll']);
export async function api(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  const allowed = !origin || origin === url.origin || origin === 'https://rw762-sketch.github.io';
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin' };
  if (origin && allowed) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
  if (!allowed) return reply({ error: 'Origin is not allowed.' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  const path = url.pathname.slice(4);
  if (!endpoints.has(path)) return reply({ error: 'Unknown endpoint.' }, 404);
  if (request.method !== (readPaths.has(path) ? 'GET' : 'POST')) return reply({ error: 'Method not allowed.' }, 405);
  try {
    let body = {};
    if (request.method === 'POST') {
      if (Number(request.headers.get('Content-Length')) > 4096) return reply({ error: 'Request too large.' }, 413);
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (reader) for (;;) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 4096) { await reader.cancel(); return reply({ error: 'Request too large.' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { return reply({ error: 'Invalid JSON.' }, 400); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ error: 'Invalid request.' }, 400);
    }
    if (!env.DB) return reply({ error: 'The game server is temporarily unavailable. Try again shortly.' }, 503);
    const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
    return reply(await storedRequest(env.DB, path, token, body));
  } catch (error) {
    if (error.status) return reply({ error: error.message }, error.status);
    // Rules errors are safe game messages; storage failures must not leak SQL/state.
    if (!/D1|SQLITE|database|JSON|payload/i.test(error.message)) return reply({ error: error.message }, 400);
    return reply({ error: 'The game server is temporarily unavailable. Try again shortly.' }, 503);
  }
}
