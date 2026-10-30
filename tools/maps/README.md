# tools/maps — regenerating the Florida maps

`images/maps/florida-roads.svg` (chapters.html "Where We Are") and `images/maps/florida-se-roads.svg`
(the home "Our Reach" South-Florida inset) are GENERATED from public-domain geodata, not hand-drawn.
They are plain static SVGs — no map library, no tiles, no runtime requests, same-origin, exactly like
the silhouettes they replaced.

Both are drawn with the SAME Albers conic projection the site's pin tables were calibrated against
(see the projection notes in geo.py), and each keeps its `viewBox` byte-identical to the old
file's, so `FLORIDA_MAP_PINS`, `FLORIDA_SE_CHAPTER_PINS`, `FLORIDA_IMPACT_PINS` and
`chapterLocatorConfig` keep working untouched. **If you regenerate, do not change the viewBox** —
every pin percentage on the site is expressed in it.

## Run

Pure-stdlib Python 3 (no pip install). The source data is NOT committed — download it first:

```sh
cd tools/maps
mkdir -p data && cd data
curl -LO https://www2.census.gov/geo/tiger/TIGER2023/PRISECROADS/tl_2023_12_prisecroads.zip
curl -LO https://www2.census.gov/geo/tiger/TIGER2023/COUNTY/tl_2023_us_county.zip
for c in 12011 12086 12099; do
  curl -LO "https://www2.census.gov/geo/tiger/TIGER2023/AREAWATER/tl_2023_${c}_areawater.zip"
done
curl -LO https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip
curl -LO https://naciscdn.org/naturalearth/10m/physical/ne_10m_lakes.zip
for z in *.zip; do unzip -o -q "$z" -d "${z%.zip}"; done
cd ..
python3 build.py            # writes both SVGs into images/maps/
```

## Sources (all public domain / open)

| layer | source |
| --- | --- |
| state outline, Florida Keys | Natural Earth 10m admin-1 states (`Florida`) |
| Lake Okeechobee | Natural Earth 10m lakes |
| interstates, Florida's Turnpike | TIGER/Line 2023 Florida primary+secondary roads (`RTTYP`/`MTFCC`) |
| South-Florida expressways + arterials | same, clipped to the inset crop |
| South-Florida land | TIGER/Line 2023 county polygons (FL) |
| Biscayne Bay, the Atlantic, Lake Worth, the Intracoastal | TIGER/Line 2023 AREAWATER (Broward, Miami-Dade, Palm Beach) |

## Things that will bite you

* **TIGER county polygons extend OFFSHORE** to the county line — a county polygon is not a shoreline.
  Land is the county fill with the AREAWATER polygons masked out.
* **The sea must stay transparent** — the `.map-frame` behind the image paints the mint wash that
  reads as sea. The inset cuts water with an SVG `<mask>`; the state map cuts Lake Okeechobee with
  `fill-rule="evenodd"`.
* **The mask's water path is also STROKED** (black, ~0.06u). Without that dilation the county
  polygon's seaward edge and the mask edge antialias against each other and leave a stray hairline
  about 6 km out to sea.
* **The coastline hairline is a separate derived layer.** A mask cuts the land path's own stroke, and
  the county boundary is offshore anyway, so the coast is extracted explicitly: a water-ring edge is
  shoreline where the point just outside it is inside the county union and inside no other water
  body. It is derived from the ALREADY-SIMPLIFIED water rings so the stroke cannot drift off the
  fill edge.
* **TIGER splits every route into hundreds of stubs.** They are stitched into continuous chains
  before simplification, otherwise Douglas-Peucker does nothing and the paths are enormous.
* **Stroke scaling is two rules, not one.** The frames are NOT in the 176/24 zoom ratio: the state
  map renders ~570px for 176 units (3.24 px/unit), the inset ~366px for 24 units (15.25 px/unit) —
  4.7x apart, not 7.33x. So dividing by 176/24 makes an inset line ~0.64x the state's on screen.
  The COASTLINE is therefore matched in pixels (`COAST_W_FULL` / `COAST_W_SE`, both ~1.2 px); the
  ROAD tiers keep the 176/24 divisor, which lands them deliberately finer on the inset because it
  carries about ten times the line density.
* **The state map's coast stroke has to stay near 0.38.** At 0.55 it is wider than the Florida Keys
  are small, so each key renders as a solid dark blob with no fill left showing.
* Short interstate runs are REAL — I-110 Pensacola (9 km), the I-195/I-395 Miami spurs (11 km),
  I-595 (24 km), the I-275 Skyway (26 km). Do not raise `min_run` to prune "stubs"; it deletes them.
