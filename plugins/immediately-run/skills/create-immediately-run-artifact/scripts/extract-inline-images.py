#!/usr/bin/env python3
"""Pull every base64 data-URI image out of an artifact's HTML.

Usage: extract-inline-images.py <artifact.html> <out-dir>

Writes <out-dir>/img/imgNN.<ext> for each image, in document order, and
<out-dir>/stripped.html with each data URI replaced by `IMG:imgNN.<ext>(NKB)`,
so the markup is small enough to read and the images can be renamed and
imported from src/assets/.
"""
import base64, os, re, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(os.path.join(out, 'img'), exist_ok=True)
html = open(src, encoding='utf-8').read()
EXT = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp', 'gif': 'gif', 'svg+xml': 'svg', 'avif': 'avif'}
count = 0

def replace(m):
    global count
    count += 1
    data = base64.b64decode(m.group(2))
    name = f'img{count:02d}.{EXT.get(m.group(1), "bin")}'
    with open(os.path.join(out, 'img', name), 'wb') as f:
        f.write(data)
    return f'IMG:{name}({len(data) // 1024}KB)'

stripped = re.sub(r'data:image/([a-z0-9+.-]+);base64,([A-Za-z0-9+/=]+)', replace, html)
open(os.path.join(out, 'stripped.html'), 'w', encoding='utf-8').write(stripped)
print(f'{count} images -> {out}/img ; stripped markup: {len(stripped)} bytes')
