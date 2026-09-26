export function bindLobby(client, getRoom) {
  const $ = id => document.getElementById(id);
  let timer, busy = false, generation = 0;
  try { $('nickname').value = sessionStorage.getItem('poker-lobby-name') || ''; } catch {}
  function row(name, detail) {
    const element = document.createElement('li');
    const strong = document.createElement('strong'); strong.textContent = name;
    const span = document.createElement('span'); span.textContent = detail;
    element.append(strong, span); return element;
  }
  function render(data) {
    $('onlineCount').textContent = data.players.length;
    $('onlinePlayers').replaceChildren(...data.players.map(p => row(`${p.name}${p.me ? ' (you)' : ''}`, p.status)));
    $('publicRooms').replaceChildren();
    if (!data.rooms.length) {
      const p = document.createElement('p'); p.textContent = 'No tables yet. Create one below.'; $('publicRooms').append(p);
    }
    for (const room of data.rooms) {
      const item = document.createElement('div'); item.className = 'lobby-table';
      const info = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = `${room.host}’s table`;
      const detail = document.createElement('span'); detail.textContent = `${room.players}/4 seats · ${room.started ? 'In progress' : room.joinable ? 'Waiting for players' : 'Full'}`;
      info.append(name, detail);
      const join = document.createElement('button'); join.type = 'button';
      const own = data.room === room.code;
      join.textContent = own ? 'Your table' : 'Join';
      join.disabled = !!getRoom() || (!own && !room.joinable);
      join.onclick = () => { $('joinCode').value = room.code; $('multiplayerForm').requestSubmit($('joinRoom')); };
      item.append(info, join); $('publicRooms').append(item);
    }
    $('presenceStatus').textContent = 'Live lobby · Updates every 5 seconds';
    $('createRoom').textContent = data.state ? 'Return to your table' : 'Create a room';
  }
  async function refresh(enter = false) {
    if (busy || $('friendsLobby').hidden || $('connectionMode').value !== 'server') return;
    const name = $('nickname').value.trim();
    if (!name) { if (enter) $('nickname').focus(); return; }
    busy = true; const current = generation;
    clearTimeout(timer);
    $('presenceStatus').textContent = 'Connecting to the lobby…';
    try {
      const data = enter || !client.token ? await client.enter(name) : await client.lobby();
      if (current !== generation || $('friendsLobby').hidden) return;
      try { sessionStorage.setItem('poker-lobby-name', name); } catch {}
      render(data);
    } catch (error) {
      if (current !== generation) return;
      $('presenceStatus').textContent = error.message;
      $('onlineCount').textContent = '—';
      $('onlinePlayers').replaceChildren(); $('publicRooms').replaceChildren();
      if (error.status === 401) client.token = '';
    } finally {
      busy = false;
      if (!$('friendsLobby').hidden && $('connectionMode').value === 'server') timer = setTimeout(() => refresh(), current === generation ? 5000 : 0);
    }
  }
  function mode() {
    const direct = $('connectionMode').value === 'direct';
    $('onlineLobby').hidden = direct; $('enterLobby').hidden = direct;
    $('directConnectionNote').hidden = !direct;
    $('createRoom').disabled = $('joinRoom').disabled = !!getRoom();
    $('connectionMode').disabled = !!getRoom();
    if (direct) { clearTimeout(timer); generation++; $('createRoom').textContent = 'Create a room'; }
    else refresh(true);
  }
  $('enterLobby').onclick = () => refresh(true);
  $('refreshLobby').onclick = () => refresh(true);
  $('connectionMode').onchange = mode;
  return {
    open() { if (getRoom()) $('connectionMode').value = getRoom().server ? 'server' : 'direct'; mode(); },
    close() { generation++; clearTimeout(timer); },
  };
}
