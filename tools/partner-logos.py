#!/usr/bin/env python3
"""Build the round logo tiles for the impact.html partner orbit (#partners).

Each source logo in `images/our impact/` becomes `images/partners/<slug>.avif`: a SIZE x SIZE
square painted in the logo's OWN ground colour (white for most, His House's blue), with the mark
scaled as large as it can go while its bounding box stays inside a circle of radius FIT * SIZE.
The tile is clipped to a circle in CSS (`.orbit-disc`), so it is the bbox CORNERS that must clear
the edge, not its sides: a wide wordmark (Lotus House) gets to span most of the disc and a square
crest sits smaller, instead of every logo shrinking into the same padded square.

The ground is the median of the source's border pixels and "ink" is anything further than THRESH
from it; THRESH is high enough to drop the faint grey outline House of New Vision ships around its
circle, so that logo lands on the same white disc as everyone else.

Usage:  python3 tools/partner-logos.py   (Pillow >= 11.2 built with AVIF; no repo deps)
New partner: drop the source into `images/our impact/`, add a PARTNERS row, re-run, then add the
node to impact.html. No EXIF/ICC is written (Pillow only carries metadata when asked to).
"""
from pathlib import Path
from statistics import median

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "images" / "our impact"
OUT = ROOT / "images" / "partners"

SIZE = 320      # px; the largest disc renders ~127 CSS px, so this is 2.5x
FIT = 0.45      # bbox corners sit on a circle this fraction of SIZE from the centre
THRESH = 48     # max per-channel distance from the ground that still counts as ground
PAD = 0.02      # grow the ink bbox by this much of its size (THRESH clips antialiased edges)
QUALITY = 72

# slug -> (source file in images/our impact/, options). Options, all per-logo fixes:
#   inset  px shaved off every edge first (His House ships a 2px pale strip down its left side,
#          which counted as ink and dragged the bbox off-centre)
#   clean  repaint every pixel within THRESH of the ground AS the ground (House of New Vision's
#          faint grey circle outline otherwise shows as two stray arcs inside the disc)
#   keep   predicate on (r, g, b); everything else becomes ground. Lotus House keeps only its pink
#          script wordmark: the navy "sundari foundation, inc." line and the grey tagline shrank
#          the mark to ~half the disc, too small to read.
#   mono   (ink, ground): paint `ink` through the source's ALPHA onto `ground`. The Palace at Weston
#          only publishes a white-on-dark mark, so it gets a disc in its own brand navy (#293148,
#          thepalace.org's stylesheet) with the mark in white, as published.
PARTNERS = {
    "broward-health": ("broward health.avif", {}),
    "nicklaus-childrens": ("nicklaus children.avif", {}),
    "joe-dimaggio": ("joe dimaggio.avif", {}),
    "his-house": ("his house.avif", {"inset": 3}),
    "lotus-house": ("lotus house.avif", {"keep": lambda r, g, b: r - g > 40}),
    "palomino-gardens": ("palomino gardens.avif", {}),
    "house-of-new-vision": ("house of new vision.avif", {"clean": True}),
    "five-star": ("five star.avif", {}),
    "wynmoor": ("wynmoor.avif", {}),
    "boys-and-girls-club": ("boys and girls club.avif", {}),
    "palace-at-weston": ("palace at weston.avif", {"mono": ((255, 255, 255), (41, 49, 72))}),
    "mammas-curry": ("mammas curry closet.avif", {}),
    "karma-for-cara": ("karma for cara.avif", {}),
    "hearts-for-the-homeless": ("hearts for the homeless.avif", {}),
}


def flatten(im):
    im = im.convert("RGBA")
    ground = Image.new("RGBA", im.size, (255, 255, 255, 255))
    return Image.alpha_composite(ground, im).convert("RGB")


def border_colour(im):
    w, h = im.size
    px = im.load()
    edge = [px[x, 0] for x in range(w)] + [px[x, h - 1] for x in range(w)]
    edge += [px[0, y] for y in range(h)] + [px[w - 1, y] for y in range(h)]
    return tuple(int(median(p[i] for p in edge)) for i in range(3))


def ink_mask(im, ground):
    diff = ImageChops.difference(im, Image.new("RGB", im.size, ground))
    r, g, b = diff.split()
    return ImageChops.lighter(ImageChops.lighter(r, g), b).point(lambda v: 255 if v > THRESH else 0)


def ink_bbox(im, ground):
    box = ink_mask(im, ground).getbbox()
    if not box:
        raise SystemExit("no ink found")
    x0, y0, x1, y1 = box
    px, py = round((x1 - x0) * PAD), round((y1 - y0) * PAD)
    return (max(0, x0 - px), max(0, y0 - py), min(im.width, x1 + px), min(im.height, y1 + py))


def build(slug, name, opts):
    src = Image.open(SRC / name)
    if opts.get("mono"):
        ink, ground = opts["mono"]
        im = Image.new("RGB", src.size, ground)
        im.paste(Image.new("RGB", src.size, ink), mask=src.convert("RGBA").getchannel("A"))
    else:
        im = flatten(src)
    inset = opts.get("inset", 0)
    if inset:
        im = im.crop((inset, inset, im.width - inset, im.height - inset))
    ground = border_colour(im)
    plain = Image.new("RGB", im.size, ground)
    if opts.get("clean"):
        im = Image.composite(im, plain, ink_mask(im, ground))
    if opts.get("keep"):
        keep = opts["keep"]
        mask = Image.new("L", im.size)
        mask.putdata([255 if keep(*p) else 0 for p in im.getdata()])
        im = Image.composite(im, plain, mask)
    mark = im.crop(ink_bbox(im, ground))
    w, h = mark.size
    # Half-diagonal of the scaled bbox == FIT * SIZE.
    scale = (2 * FIT * SIZE) / (w * w + h * h) ** 0.5
    mark = mark.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    tile = Image.new("RGB", (SIZE, SIZE), ground)
    tile.paste(mark, ((SIZE - mark.width) // 2, (SIZE - mark.height) // 2))
    OUT.mkdir(exist_ok=True)
    dest = OUT / f"{slug}.avif"
    tile.save(dest, "AVIF", quality=QUALITY)
    print(f"{dest.relative_to(ROOT)}  ground={ground}  mark={mark.width}x{mark.height}  scale={scale:.2f}")


if __name__ == "__main__":
    for slug, (name, opts) in PARTNERS.items():
        build(slug, name, opts)
