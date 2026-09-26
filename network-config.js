// Serve the game with server/index.mjs, or set an HTTPS API base for a separate server.
export const MULTIPLAYER_API_URL = '/api';
// Public browser configuration only. Never put a provider account/API secret here.
// Configure a HTTPS endpoint returning short-lived RTCIceServer[] credentials.
// The endpoint must allow this site's origin (CORS) and return Cache-Control: no-store.
export const TURN_CREDENTIALS_URL = '';
export const STUN_SERVERS = [{ urls:'stun:stun.l.google.com:19302' }];
export async function peerConfiguration(fetchCredentials = fetch, endpoint = TURN_CREDENTIALS_URL) {
  if (!endpoint) return { iceServers:STUN_SERVERS.map(server => ({ ...server })) };
  if (!/^https:\/\//.test(endpoint)) throw Error('The multiplayer relay endpoint must use HTTPS.');
  let response;
  try { response = await fetchCredentials(endpoint, { cache:'no-store', signal:AbortSignal.timeout(10000) }); }
  catch { throw Error('The multiplayer relay is unavailable. Try again shortly.'); }
  if (!response.ok) throw Error('The multiplayer relay could not authorize this connection.');
  const servers = await response.json();
  if (!Array.isArray(servers) || !servers.length || servers.length > 12) throw Error('Invalid multiplayer relay configuration.');
  let relay = false;
  for (const server of servers) {
    const urls = Array.isArray(server?.urls) ? server.urls : [server?.urls];
    if (!urls.length || !urls.every(url => typeof url === 'string' && /^(stun|turn|turns):[^\s]+$/.test(url))) throw Error('Invalid multiplayer relay address.');
    if (urls.some(url => /^turns?:/.test(url))) {
      relay = true;
      if (typeof server.username !== 'string' || !server.username || typeof server.credential !== 'string' || !server.credential) throw Error('Missing multiplayer relay credentials.');
    }
  }
  if (!relay) throw Error('The multiplayer relay service did not provide a relay.');
  return { iceServers:[...STUN_SERVERS.map(server => ({ ...server })), ...servers] };
}
