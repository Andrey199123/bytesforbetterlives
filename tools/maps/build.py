#!/usr/bin/env python3
"""Generate images/maps/florida-roads.svg and images/maps/florida-se-roads.svg.

Read tools/maps/README.md first — it lists the data downloads and the traps.

Both maps are drawn with the Albers conic the site's pin tables were calibrated against, and each
keeps its viewBox byte-identical to the silhouette it replaced, so every pin percentage in
script.js (FLORIDA_MAP_PINS, FLORIDA_SE_CHAPTER_PINS, FLORIDA_IMPACT_PINS, chapterLocatorConfig)
keeps working untouched. DO NOT CHANGE THE viewBoxes.

    python3 build.py [--out ../../images/maps]
"""
import argparse
import collections
import json
import math
import os

import geo
import shp
import shoreline

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')

FULL_VB = "630 435 176 152"
SE_VB = "780 526.5 24 26"
FULL_BOX = geo.FLORIDA_VIEWBOX
SE_BOX = geo.FLORIDA_SE_CROP
# The inset is exactly this much more zoomed in, so every stroke width is divided by it and the two
# maps read as siblings on screen.
ZOOM = 176.0 / 24.0

# Palette (literal values — the SVGs load via <img>, so page CSS and custom properties DO NOT apply)
LAND = "#bcd6b2"
COAST = "#7fa476"
ROAD = "#FCFAF5"          # paper: roads read as lines carved out of the land

# The coastline is the same KIND of line on both maps, so it is matched in ON-SCREEN PIXELS (~1.2 px)
# rather than by the geographic zoom ratio. The two frames are not in the ZOOM ratio: the state map
# renders ~570 px for 176 units (3.24 px/unit) and the inset ~366 px for 24 units (15.25 px/unit), so
# their px/unit differ by 4.7x, not 7.33x. Dividing a stroke by ZOOM therefore makes the inset line
# ~0.64x the state's on screen — which is what the ROAD tiers deliberately want (the inset carries
# roughly ten times the line density), but not what a shoreline wants.
COAST_W_FULL = 0.38       # x3.24 px/unit = 1.23 px
COAST_W_SE = 0.08         # x15.25 px/unit = 1.22 px


def d(*parts):
    return os.path.join(DATA, *parts)


# --------------------------------------------------------------------------- road geometry

def _len(pts):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(pts, pts[1:]))


def _key(pt, q=1e-4):
    return (round(pt[0] / q), round(pt[1] / q))


def stitch(lines):
    """Join TIGER's short segments into long chains ONLY across degree-2 nodes.

    TIGER splits every route into hundreds of stubs; without stitching, Douglas-Peucker has nothing
    to simplify and the paths are enormous. Joining only where exactly two segment ends meet means
    an interchange (degree 3+) never fuses two different roads into one fictional road.
    """
    deg = collections.Counter()
    for _, pts in lines:
        deg[_key(pts[0])] += 1
        deg[_key(pts[-1])] += 1
    ends = collections.defaultdict(list)
    for i, (_, pts) in enumerate(lines):
        ends[_key(pts[0])].append((i, 0))
        ends[_key(pts[-1])].append((i, 1))
    used = [False] * len(lines)
    out = []
    for start in range(len(lines)):
        if used[start]:
            continue
        used[start] = True
        prio, pts = lines[start]
        chain = list(pts)
        best = prio
        for forward in (True, False):
            while True:
                tip = chain[-1] if forward else chain[0]
                k = _key(tip)
                if deg[k] != 2:
                    break
                cand = [(j, e) for (j, e) in ends[k] if not used[j]]
                if len(cand) != 1:
                    break
                j, e = cand[0]
                used[j] = True
                pj, q = lines[j]
                best = min(best, pj)
                seg = list(q) if e == 0 else list(reversed(q))
                if forward:
                    chain += seg[1:]
                else:
                    chain = list(reversed(seg[1:])) + chain
        out.append((best, chain))
    return out


def _resample(pts, step):
    out = [pts[0]]
    carry = 0.0
    for a, b in zip(pts, pts[1:]):
        dist = math.hypot(b[0] - a[0], b[1] - a[1])
        if dist == 0:
            continue
        t = step - carry
        while t <= dist:
            out.append((a[0] + (b[0] - a[0]) * t / dist, a[1] + (b[1] - a[1]) * t / dist))
            t += step
        carry = dist - (t - step)
    out.append(pts[-1])
    return out


class _Grid:
    def __init__(self, tol):
        self.tol = tol
        self.g = collections.defaultdict(list)

    def add(self, pts):
        for p in pts:
            self.g[(int(p[0] // self.tol), int(p[1] // self.tol))].append(p)

    def near(self, p):
        cx, cy = int(p[0] // self.tol), int(p[1] // self.tol)
        t2 = self.tol * self.tol
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for q in self.g.get((cx + dx, cy + dy), ()):
                    if (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 <= t2:
                        return True
        return False


def dedupe(chains, tol, frac=0.80, seed=None):
    """Drop a chain already drawn by a kept one.

    TIGER draws a divided highway as TWO centrelines ~150 m apart, and names the same asphalt
    several ways ("I- 95", "State Hwy 9A"). At these scales those are the same line, so drawing all
    of them doubles the ink and the bytes. Highest-priority, longest-first wins.
    """
    grid = seed if seed is not None else _Grid(tol)
    kept, dropped = [], 0
    for prio, pts in sorted(chains, key=lambda c: (c[0], -_len(c[1]))):
        s = _resample(pts, tol)
        if s and sum(1 for p in s if grid.near(p)) / len(s) > frac:
            dropped += 1
            continue
        grid.add(_resample(pts, tol * 0.6))
        kept.append((prio, pts))
    return kept, dropped, grid


def road_layer(lines, box, eps, min_run, dup_tol, prec, seed=None):
    chains = stitch(lines)
    kept, dropped, grid = dedupe(chains, dup_tol, seed=seed)
    runs = []
    for _, c in kept:
        for r in geo.clip_line(geo.rdp(c, eps), box, pad=box[2] * 0.02):
            if _len(r) >= min_run:
                runs.append(r)
    return geo.path_d(runs, prec=prec), dict(chains=len(chains), deduped=dropped, runs=len(runs)), grid


# --------------------------------------------------------------------------- the two maps

# TIGER mis-classes these real limited-access expressways as ordinary secondary roads.
PROMOTE = {'Snapper Creek Expy', 'State Hwy 878', 'Hialeah Expy'}

# Arterial-tier knobs: the tier is what makes the inset read as South Florida, so it is tuned for
# the smallest file that still shows the full coastal grid and its hard Everglades edge.
ART_EPS = float(os.environ.get('ART_EPS', 0.03))
ART_MIN = float(os.environ.get('ART_MIN', 0.35))
ART_DUP = float(os.environ.get('ART_DUP', 0.045))


def _prio(r):
    if r['RTTYP'] == 'I':
        return 0
    if r['RTTYP'] == 'U':
        return 1
    if r['MTFCC'] == 'S1100':
        return 2 if not r['FULLNAME'].startswith(('State Hwy', 'State Rte', 'State Rd')) else 3
    return 4


def load_roads():
    recs = shp.read_dbf(d('tl_2023_12_prisecroads', 'tl_2023_12_prisecroads.dbf'))
    geoms = shp.read_shp(d('tl_2023_12_prisecroads', 'tl_2023_12_prisecroads.shp'))
    return recs, [parts for (_st, parts) in geoms]


def build_full(recs, parts):
    """Whole-state map: real coastline + the Keys, Lake Okeechobee, interstates + the Turnpike.

    At 176 units across (~3.1 px/unit) only the limited-access skeleton stays legible; the US
    highways were built and rejected — they doubled the ink without adding a readable feature.
    """
    fl = [i for i, x in enumerate(shp.read_dbf(d('ne_10m_admin_1_states_provinces',
                                                 'ne_10m_admin_1_states_provinces.dbf')))
          if x['name'] == 'Florida' and x['admin'] == 'United States of America']
    states = shp.read_shp(d('ne_10m_admin_1_states_provinces', 'ne_10m_admin_1_states_provinces.shp'))
    rings = []
    for part in states[fl[0]][1]:
        pr = [geo.project(l, la) for (l, la) in part]
        xs = [p[0] for p in pr]
        ys = [p[1] for p in pr]
        if max(xs) < FULL_BOX[0] or min(xs) > FULL_BOX[0] + FULL_BOX[2]:
            continue
        if max(ys) < FULL_BOX[1] or min(ys) > FULL_BOX[1] + FULL_BOX[3]:
            continue
        if max(max(xs) - min(xs), max(ys) - min(ys)) < 0.25:   # specks, invisible at 3.1 px/unit
            continue
        rings.append(geo.rdp(pr, 0.15))
    land_d = geo.path_d(rings, prec=1, close=True)

    lr = shp.read_dbf(d('ne_10m_lakes', 'ne_10m_lakes.dbf'))
    lg = shp.read_shp(d('ne_10m_lakes', 'ne_10m_lakes.shp'))
    lake_d = ''
    for i, x in enumerate(lr):
        if 'Okeechobee' in str(x.get('name', '')):
            lake_d = geo.path_d([geo.rdp([geo.project(l, la) for (l, la) in lg[i][1][0]], 0.05)],
                                prec=1, close=True)
    inter = [(_prio(recs[i]), [geo.project(l, la) for (l, la) in p])
             for i in range(len(recs)) if recs[i]['RTTYP'] == 'I'
             for p in parts[i] if len(p) > 1]
    toll = [(_prio(recs[i]), [geo.project(l, la) for (l, la) in p])
            for i in range(len(recs)) if 'Tpke' in recs[i]['FULLNAME']
            for p in parts[i] if len(p) > 1]
    inter_d, si, grid = road_layer(inter, FULL_BOX, 0.1, 0.8, 0.25, prec=1)
    toll_d, st, _ = road_layer(toll, FULL_BOX, 0.1, 0.8, 0.25, prec=1, seed=grid)
    print("  full: interstate %s  toll %s" % (si, st))
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" role="img" '
            'aria-label="Map of Florida showing the interstate highways">'
            '<path d="%s%s" fill="%s" fill-rule="evenodd" stroke="%s" stroke-width="%s" '
            'stroke-linejoin="round"/>'
            '<path d="%s" fill="none" stroke="%s" stroke-width="0.5" stroke-opacity="0.75" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="%s" fill="none" stroke="%s" stroke-width="0.7" stroke-opacity="1" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
            '</svg>') % (FULL_VB, land_d, lake_d, LAND, COAST, COAST_W_FULL, toll_d, ROAD, inter_d, ROAD)


def build_se(recs, parts):
    """South-Florida inset: true shoreline, the bays, the expressway + arterial grid.

    At 24 units across (~15.4 px/unit) the arterial tier is what makes the map READ as South
    Florida — the dense coastal grid stopping dead at the Everglades. Motorways alone do not show
    that edge.
    """
    counties = shp.read_dbf(d('tl_2023_us_county', 'tl_2023_us_county.dbf'))
    cgeo = shp.read_shp(d('tl_2023_us_county', 'tl_2023_us_county.shp'))
    pad = 1.0

    def near_box(pts):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return not (max(xs) < SE_BOX[0] - pad or min(xs) > SE_BOX[0] + SE_BOX[2] + pad or
                    max(ys) < SE_BOX[1] - pad or min(ys) > SE_BOX[1] + SE_BOX[3] + pad)

    land = []
    for i, x in enumerate(counties):
        if x['STATEFP'] != '12':
            continue
        for part in cgeo[i][1]:
            pr = [geo.project(l, la) for (l, la) in part]
            if near_box(pr):
                land.append(pr)

    water = []
    for c in ('12011', '12086', '12099'):
        wr = shp.read_dbf(d('tl_2023_%s_areawater' % c, 'tl_2023_%s_areawater.dbf' % c))
        wg = shp.read_shp(d('tl_2023_%s_areawater' % c, 'tl_2023_%s_areawater.shp' % c))
        for i, x in enumerate(wr):
            aw = float(x['AWATER'] or 0)
            nm = (x['FULLNAME'] or '').strip()
            if 'Okeechobee' in nm:
                keep = False          # the county's share of the lake is cut by a straight county
            elif x['MTFCC'] in ('H2053', 'H2051'):
                keep = True           # line and renders as an angular wedge; NE has the whole lake
            elif 'ntracoastal' in nm or 'ntercoastal' in nm:
                keep = aw >= 2e5
            elif x['MTFCC'] == 'H2030':
                keep = aw >= 6e6 and bool(nm)   # a hundred tiny impoundments would be clutter
            else:
                keep = False
            if keep:
                for part in wg[i][1]:
                    pr = [geo.project(l, la) for (l, la) in part]
                    if near_box(pr):
                        water.append(pr)
    lr = shp.read_dbf(d('ne_10m_lakes', 'ne_10m_lakes.dbf'))
    lg = shp.read_shp(d('ne_10m_lakes', 'ne_10m_lakes.shp'))
    for i, x in enumerate(lr):
        if 'Okeechobee' in str(x.get('name', '')):
            for part in lg[i][1]:
                pr = [geo.project(l, la) for (l, la) in part]
                if near_box(pr):
                    water.append(pr)

    # Simplify the water rings FIRST and derive the coastline FROM the simplified rings, so the
    # drawn hairline and the mask edge are the same geometry and cannot drift apart.
    water = [geo.rdp(w, 0.02) for w in water]
    cedges = set()
    for ring in land:
        for i in range(len(ring)):
            cedges.add(shoreline.edge_key(ring[i], ring[(i + 1) % len(ring)]))
    shore = []
    for run in shoreline.shoreline(water, land, eps=0.0, exclude_edges=cedges):
        shore += geo.clip_line(run, SE_BOX, pad=0.05)
    shore_d = geo.path_d(shore, prec=2)
    # The land ring is only ever seen through the mask (its own outline is the offshore county
    # line), so it simplifies hard for free — leaving it unsimplified costs ~28 KB of the file.
    land_d = geo.path_d([geo.rdp(p, 0.02) for p in (geo.poly_clip(q, SE_BOX, 0.5) for q in land)
                         if len(p) > 2], prec=2, close=True)
    water_d = geo.path_d([p for p in (geo.poly_clip(q, SE_BOX, 0.5) for q in water) if len(p) > 2],
                         prec=2, close=True)

    def tier_of(r):
        if r['MTFCC'] == 'S1100' or r['FULLNAME'] in PROMOTE:
            return 1
        if r['MTFCC'] == 'S1200':
            return 2 if r['RTTYP'] in ('U', 'S') else 3
        return None

    lines = {1: [], 2: []}
    for i, r in enumerate(recs):
        t = tier_of(r)
        if t not in lines:
            continue
        for p in parts[i]:
            if len(p) < 2:
                continue
            pr = [geo.project(l, la) for (l, la) in p]
            if near_box(pr):
                lines[t].append((_prio(r), pr))
    motor_d, sm, grid = road_layer(lines[1], SE_BOX, 0.02, 0.2, 0.03, prec=2)
    art_d, sa, _ = road_layer(lines[2], SE_BOX, ART_EPS, ART_MIN, ART_DUP, prec=2, seed=grid)
    print("  se: motorway %s  arterial %s" % (sm, sa))

    z = lambda v: round(v / ZOOM, 4)
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="%s" role="img" '
            'aria-label="Map of South Florida showing the coast and the expressway network">'
            # The mask is what keeps the sea TRANSPARENT (the .map-frame behind paints the wash that
            # reads as sea). Its water path is STROKED as well as filled: that dilates water by
            # ~150 m, and without it the county polygon's seaward edge and the mask edge antialias
            # against each other and leave a stray hairline ~6 km out to sea.
            '<mask id="bfbl-sea" maskUnits="userSpaceOnUse" x="779" y="525.5" width="26" height="28">'
            '<rect x="779" y="525.5" width="26" height="28" fill="#fff"/>'
            '<path d="%s" fill="#000" stroke="#000" stroke-width="0.06" stroke-linejoin="round"/>'
            '</mask>'
            '<g mask="url(#bfbl-sea)">'
            '<path d="%s" fill="%s"/>'
            '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-opacity="0.6" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
            '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-opacity="1" '
            'stroke-linecap="round" stroke-linejoin="round"/>'
            '</g>'
            # Drawn OUTSIDE the mask: a mask cuts the land path's own stroke, and the county
            # boundary is offshore anyway, so the coast has to be its own derived layer.
            '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" '
            'stroke-linecap="round"/>'
            '</svg>') % (SE_VB, water_d, land_d, LAND,
                         art_d, ROAD, z(0.3), motor_d, ROAD, z(0.7),
                         shore_d, COAST, COAST_W_SE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                                  '..', '..', 'public', 'images', 'maps'))
    args = ap.parse_args()
    recs, parts = load_roads()
    out = os.path.abspath(args.out)
    for name, svg in (('florida-roads.svg', build_full(recs, parts)),
                      ('florida-se-roads.svg', build_se(recs, parts))):
        p = os.path.join(out, name)
        open(p, 'w').write(svg)
        print("wrote %s (%d bytes)" % (p, len(svg)))


if __name__ == '__main__':
    main()
