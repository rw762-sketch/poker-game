import { api } from './cloud-handler.mjs';
import assets from './assets.generated.mjs';
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return api(request, env);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
    const asset = assets[url.pathname === '/' ? '/index.html' : url.pathname];
    if (!asset) return new Response('Not found', { status: 404 });
    return new Response(request.method === 'HEAD' ? null : asset.content, { headers: {
      'Content-Type': asset.type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff',
    } });
  },
};
