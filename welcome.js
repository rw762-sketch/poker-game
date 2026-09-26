// Keep previously shared room links working after adding the opening screen.
if (new URLSearchParams(location.hash.slice(1)).has('room')) {
  const destination = new URL('friends.html', location.href);
  destination.hash = location.hash;
  location.replace(destination.href);
}
