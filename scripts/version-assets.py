"""Keep HTML, CSS and module requests on the same cache version before publishing."""
from pathlib import Path
import hashlib
import re

root = Path(__file__).resolve().parents[1]
files = sorted(root.glob('*.js')) + [root / 'style.css', root / 'index.html']
canonical = {p: re.sub(r'\?v=[a-f0-9]{12}', '', p.read_text()) for p in files}
version = hashlib.sha256(''.join(p.name + canonical[p] for p in files).encode()).hexdigest()[:12]
for path, source in canonical.items():
    if path.suffix == '.js':
        source = re.sub(r"(['\"])(\./[^'\"?]+\.js)\1", lambda m: f'{m[1]}{m[2]}?v={version}{m[1]}', source)
    elif path.suffix == '.html':
        source = source.replace('href="style.css"', f'href="style.css?v={version}"')
        source = source.replace('src="app.js"', f'src="app.js?v={version}"')
    path.write_text(source)
print(version)
