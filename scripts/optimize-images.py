#!/usr/bin/env python3
"""Turn raw 2x PNG screenshots into responsive WebP files for the sites.

    python3 scripts/optimize-images.py <src_dir> <dest_dir> [--widths 800,1600] [--q 82]

Each <name>.png becomes <name>-<w>.webp for every width that is not larger than
the source. Aspect ratio is kept; use --crop WxH (e.g. 16x10) to centre-crop to a
fixed ratio from the top of the page (hero shots keep their headline).
"""
import argparse, subprocess, tempfile, pathlib
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('src'); ap.add_argument('dest')
ap.add_argument('--widths', default='800,1600')
ap.add_argument('--q', type=int, default=82)
ap.add_argument('--crop', default='')
ap.add_argument('--only', default='', help='comma list of basenames to process')
a = ap.parse_args()

src, dest = pathlib.Path(a.src), pathlib.Path(a.dest)
dest.mkdir(parents=True, exist_ok=True)
widths = [int(w) for w in a.widths.split(',')]
only = set(filter(None, a.only.split(',')))

for png in sorted(src.glob('*.png')):
    if only and png.stem not in only:
        continue
    im = Image.open(png).convert('RGB')
    if a.crop:
        rw, rh = (int(x) for x in a.crop.lower().split('x'))
        want_h = round(im.width * rh / rw)
        if want_h < im.height:
            im = im.crop((0, 0, im.width, want_h))       # keep the top (hero)
        else:
            want_w = round(im.height * rw / rh)
            left = (im.width - want_w) // 2
            im = im.crop((left, 0, left + want_w, im.height))
    for w in widths:
        if w > im.width:
            continue
        h = round(im.height * w / im.width)
        with tempfile.NamedTemporaryFile(suffix='.png') as tmp:
            im.resize((w, h), Image.LANCZOS).save(tmp.name, optimize=True)
            out = dest / f'{png.stem}-{w}.webp'
            subprocess.run(['cwebp', '-quiet', '-q', str(a.q), '-m', '6', tmp.name, '-o', str(out)], check=True)
            print(f'{out.name}  {w}x{h}  {out.stat().st_size // 1024} KB')
