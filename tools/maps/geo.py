"""Shared geo toolkit for the BFBL Florida maps.

Projection is the SAME Albers conic the existing pin tables were calibrated against
(projection calibration): n=0.60283700, C=1.35122133, lng0=-96.
Verified: it reproduces every published FLORIDA_MAP_PINS / FLORIDA_SE_CHAPTER_PINS % exactly.
"""
import math

N = 0.60283700
C = 1.35122133
LNG0 = -96.0
SX = 479.96
SY = -1332.38
K = 1264.138

FLORIDA_VIEWBOX = (630.0, 435.0, 176.0, 152.0)      # full state map
FLORIDA_SE_CROP = (780.0, 526.5, 24.0, 26.0)        # home inset


def project(lng, lat):
    phi = math.radians(lat)
    lam = math.radians(lng - LNG0)
    rho = math.sqrt(C - 2 * N * math.sin(phi)) / N
    th = N * lam
    return (SX + K * rho * math.sin(th), SY + K * rho * math.cos(th))


def inverse(X, Y):
    lat, lng = 27.0, -81.0
    for _ in range(80):
        x, y = project(lng, lat)
        e = 1e-6
        x1, y1 = project(lng, lat + e)
        x2, y2 = project(lng + e, lat)
        a = (x1 - x) / e; b = (x2 - x) / e
        c = (y1 - y) / e; d = (y2 - y) / e
        det = a * d - b * c
        dx = X - x; dy = Y - y
        dlat = (d * dx - b * dy) / det
        dlng = (-c * dx + a * dy) / det
        lat += dlat; lng += dlng
        if abs(dlat) < 1e-11 and abs(dlng) < 1e-11:
            break
    return lat, lng


def bbox_of(viewbox, pad_deg=0.25):
    """Lat/lng bbox that safely covers a projected viewBox (the grid is slightly rotated)."""
    x, y, w, h = viewbox
    corners = [inverse(x, y), inverse(x + w, y), inverse(x, y + h), inverse(x + w, y + h)]
    lats = [c[0] for c in corners]; lngs = [c[1] for c in corners]
    return (min(lats) - pad_deg, min(lngs) - pad_deg, max(lats) + pad_deg, max(lngs) + pad_deg)


# ---------- geometry helpers (projected units) ----------

def rdp(pts, eps):
    """Douglas-Peucker on projected points."""
    if len(pts) < 3:
        return list(pts)
    stack = [(0, len(pts) - 1)]
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    while stack:
        i, j = stack.pop()
        if j <= i + 1:
            continue
        ax, ay = pts[i]; bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        den = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if den == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(dy * px - dx * py + bx * ay - by * ax) / den
            if d > best:
                best, bi = d, k
        if best > eps:
            keep[bi] = True
            stack.append((i, bi)); stack.append((bi, j))
    return [p for p, k in zip(pts, keep) if k]


def clip_line(pts, box, pad=0.0):
    """Split a projected polyline into the runs that intersect box=(x,y,w,h) (with pad)."""
    x, y, w, h = box
    x0, y0, x1, y1 = x - pad, y - pad, x + w + pad, y + h + pad

    def inside(p):
        return x0 <= p[0] <= x1 and y0 <= p[1] <= y1

    runs, cur = [], []
    for i, p in enumerate(pts):
        if inside(p):
            cur.append(p)
        else:
            if cur:
                cur.append(p)          # keep one point outside so the line exits the frame
                runs.append(cur)
                cur = []
            elif i + 1 < len(pts) and inside(pts[i + 1]):
                cur = [p]              # entering
            elif i + 1 < len(pts):
                # segment may cross the box without either endpoint inside
                if _seg_hits(p, pts[i + 1], (x0, y0, x1, y1)):
                    runs.append([p, pts[i + 1]])
    if cur:
        runs.append(cur)
    return [r for r in runs if len(r) > 1]


def _seg_hits(p, q, r):
    x0, y0, x1, y1 = r
    if max(p[0], q[0]) < x0 or min(p[0], q[0]) > x1:
        return False
    if max(p[1], q[1]) < y0 or min(p[1], q[1]) > y1:
        return False
    return True


def poly_clip(ring, box, pad=0.0):
    """Sutherland-Hodgman clip of a projected ring to box=(x,y,w,h)."""
    x, y, w, h = box
    x0, y0, x1, y1 = x - pad, y - pad, x + w + pad, y + h + pad
    def clip_edge(poly, inside, isect):
        out = []
        n = len(poly)
        for i in range(n):
            a = poly[i]; b = poly[(i + 1) % n]
            ain, bin_ = inside(a), inside(b)
            if ain:
                out.append(a)
                if not bin_:
                    out.append(isect(a, b))
            elif bin_:
                out.append(isect(a, b))
        return out
    def ix_x(a, b, xv):
        t = (xv - a[0]) / (b[0] - a[0]) if b[0] != a[0] else 0.0
        return (xv, a[1] + t * (b[1] - a[1]))
    def ix_y(a, b, yv):
        t = (yv - a[1]) / (b[1] - a[1]) if b[1] != a[1] else 0.0
        return (a[0] + t * (b[0] - a[0]), yv)
    p = list(ring)
    p = clip_edge(p, lambda q: q[0] >= x0, lambda a, b: ix_x(a, b, x0))
    if not p: return []
    p = clip_edge(p, lambda q: q[0] <= x1, lambda a, b: ix_x(a, b, x1))
    if not p: return []
    p = clip_edge(p, lambda q: q[1] >= y0, lambda a, b: ix_y(a, b, y0))
    if not p: return []
    p = clip_edge(p, lambda q: q[1] <= y1, lambda a, b: ix_y(a, b, y1))
    return p


def fmt(v, prec):
    s = ("%." + str(prec) + "f") % v
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s or "0"


def path_d(runs, prec=2, close=False):
    """Emit an SVG path `d` from projected point runs, using relative-ish absolute commands."""
    parts = []
    for run in runs:
        if len(run) < 2:
            continue
        d = "M" + fmt(run[0][0], prec) + "," + fmt(run[0][1], prec)
        px, py = run[0]
        for (x, y) in run[1:]:
            if abs(x - px) < 10 ** (-prec) / 2 and abs(y - py) < 10 ** (-prec) / 2:
                continue
            d += "L" + fmt(x, prec) + "," + fmt(y, prec)
            px, py = x, y
        if close:
            d += "Z"
        parts.append(d)
    return "".join(parts)
