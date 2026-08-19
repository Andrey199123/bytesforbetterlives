"""Extract a TRUE shoreline polyline for the SE inset.

Land = county polygons (which extend OFFSHORE to the county line); water = AREAWATER polygons.
An SVG <mask> gives the right land FILL but cuts the land path's stroke, and the county boundary is
offshore anyway — so nothing draws the coast. This derives the coast directly: an edge of a water
ring is SHORELINE where the point just outside it is inside the county union and inside no other
water body. The Atlantic polygon's offshore county-line edges fail the first test; interior
water-to-water joins fail the second.

Point-in-set uses even-odd ray casting over a y-bucketed edge index (rings within one set never
overlap, and shapefile holes are reversed rings, so even-odd is correct).
"""
import math
import geo


class RingSet:
    __slots__ = ('cell', 'y0', 'buckets')

    def __init__(self, rings, cell=0.05):
        self.cell = cell
        ys = [p[1] for r in rings for p in r]
        self.y0 = min(ys) if ys else 0.0
        self.buckets = {}
        for r in rings:
            n = len(r)
            for i in range(n):
                x1, y1 = r[i]
                x2, y2 = r[(i + 1) % n]
                if y1 == y2:
                    continue
                lo, hi = (y1, y2) if y1 < y2 else (y2, y1)
                b0 = int((lo - self.y0) / cell)
                b1 = int((hi - self.y0) / cell)
                e = (x1, y1, x2, y2)
                for b in range(b0, b1 + 1):
                    self.buckets.setdefault(b, []).append(e)

    def contains(self, pt):
        x, y = pt
        b = int((y - self.y0) / self.cell)
        inside = False
        for (x1, y1, x2, y2) in self.buckets.get(b, ()):
            if (y1 > y) != (y2 > y):
                xc = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                if x < xc:
                    inside = not inside
        return inside


def edge_key(p, q):
    a = (round(p[0], 6), round(p[1], 6))
    b = (round(q[0], 6), round(q[1], 6))
    return (a, b) if a <= b else (b, a)


def shoreline(water_rings, land_rings, eps=0.012, probe=0.02, min_len=0.06, exclude_edges=None):
    land = RingSet(land_rings)
    water = RingSet(water_rings)
    runs = []
    for ring in water_rings:
        n = len(ring)
        if n < 4:
            continue
        a2 = 0.0
        for i in range(n):
            x1, y1 = ring[i]
            x2, y2 = ring[(i + 1) % n]
            a2 += x1 * y2 - x2 * y1
        sign = 1.0 if a2 > 0 else -1.0
        cur = []
        for i in range(n):
            p = ring[i]
            q = ring[(i + 1) % n]
            dx, dy = q[0] - p[0], q[1] - p[1]
            L = math.hypot(dx, dy)
            if L == 0:
                continue
            mx, my = (p[0] + q[0]) * 0.5, (p[1] + q[1]) * 0.5
            nx, ny = (dy / L) * sign, (-dx / L) * sign   # outward from the water interior
            t = (mx + nx * probe, my + ny * probe)
            if exclude_edges is not None and edge_key(p, q) in exclude_edges:
                # This edge IS a county boundary (TIGER shares edges between the county polygon and
                # its AREAWATER), i.e. the seaward county limit — a legal line in open ocean, not a
                # coast. Drawing it put a stray hairline a few km out to sea.
                ok = False
            else:
                ok = land.contains(t) and not water.contains(t)
            if ok:
                if not cur:
                    cur = [p]
                cur.append(q)
            else:
                if len(cur) > 1:
                    runs.append(cur)
                cur = []
        if len(cur) > 1:
            runs.append(cur)
    out = []
    for r in runs:
        s = geo.rdp(r, eps)
        if len(s) < 2:
            continue
        ln = sum(math.hypot(s[i + 1][0] - s[i][0], s[i + 1][1] - s[i][1]) for i in range(len(s) - 1))
        if ln >= min_len:
            out.append(s)
    return out
