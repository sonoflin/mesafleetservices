# Mesa Zoning Modernization — Interactive Presentation

A mobile-first web presentation explaining the City of Mesa's proposed
**Fleet-Based Services & Service Station** text amendments to the Zoning Ordinance
(Title 11, Chapters 6, 7, 8, 31 & 86), built for City Council, staff, and the public.

It covers three things the amendment changes — **Fleet-Based Services** (incl. drone
delivery and robo-taxi / delivery fleets), **Accessory EV Charging**, and modernized
**Service Stations** — and centers on an **interactive zoning map** built from Mesa's
real GIS data showing where each use is allowed *today* vs. *under the proposal*.

## What's inside

| Section | Description |
|---|---|
| **Overview** | Plain-language summary of the three rule changes |
| **Technology** | Real-world examples (Zipline, Wing × Walmart, Amazon Prime Air; large-scale & fleet EV charging) with photos and links to each operator. Includes a light-touch note on pending AZ legislation (HB 2875) and why the code regulates "aerial-based vehicles" rather than naming drones. |
| **Interactive Map** | Leaflet map of all ~8,000 Mesa zoning areas (constrained to Mesa). Pick a use → toggle Today / Proposed / Changes → switch street/satellite basemap. Tap any area for its rule. Stats are reported in **acres** across mapped zoning areas. |
| **Changes chart** | A district-by-district comparison table (Today → Proposed) for all three uses, with changed cells highlighted — complements the map. |
| **Standards** | The development standards that protect neighborhoods (canopy, lighting, noise, screening, etc.) |
| **FAQ** | Succinct answers to the questions councilmembers and the public will ask |
| **Timeline** | The path from open house → P&Z → Council → effective date |

The site is styled to the **City of Mesa brand standards** (Blue `#0071B9`, Red `#BB2034`,
Amber `#E47D1C`, Avenir-family typography, the official logo and "mesa bar" motif) and uses
fluid type/layout so it presents well on Council TVs and on phones/tablets alike.

## Run it locally

The app loads the zoning data via `fetch()`, so it must be served over **http** — you
can't just double-click `index.html` (the browser blocks `file://` fetches).

```bash
# from the project root
python -m http.server 8000
# then open http://localhost:8000
```

Any static server works (`npx serve`, VS Code Live Server, etc.). An internet
connection is needed for the map tiles (Esri satellite / CARTO street) and the Leaflet
library, which load from their CDNs.

## Project structure

```
index.html                 # single-page app
assets/
  css/styles.css           # mobile-first styles
  js/data.js               # district + permission matrix, content (FAQ, standards, tech, timeline)
  js/map.js                # Leaflet map module
  js/app.js                # rendering + UI wiring
  img/                      # licensed photos (Wikimedia Commons)
data/
  mesa_zoning.geojson       # ~8,000 Mesa zoning polygons (real GIS data)
scripts/
  fetch_zoning.py           # how the GeoJSON was pulled (for reproducibility)
onepager.html               # standalone, print-ready one-page council leave-behind
```

> Internal source material (`docs/`, `brand standards/`, `images/`) is kept **local only**
> via `.gitignore` and is not published to the public site.

## How the data was built

- **Zoning geometry** was pulled from the City of Mesa ArcGIS REST service
  (`Planning/ZoningOverlay/MapServer/1`, the "Zoning" polygon layer) behind the public
  [Planning & Zoning interactive map](https://gis.mesaaz.gov/Html5Viewer/index.html?viewer=PlanningZoning),
  simplified, and saved as GeoJSON. See `scripts/fetch_zoning.py`.
- **Permission shading** (where each use is allowed) is encoded in
  `assets/js/data.js` directly from the draft ordinance's land-use tables
  (Tables 11-6-2, 11-7-2, 11-8-2) and staff report.

## Deploy to GitHub Pages

The site is fully static — no build step.

```bash
git init
git add .
git commit -m "Mesa zoning modernization presentation"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Then in the repo: **Settings → Pages → Build and deployment → Deploy from a branch →
`main` / `/ (root)`**. The included `.nojekyll` file ensures the `data/` folder is served
as-is. Your site will be live at `https://<user>.github.io/<repo>/`.

## Disclaimer

This is an **unofficial public-information tool**. The permission shading is a
plain-language interpretation of the *draft* land-use tables and is **not an official
zoning determination**. Confirm any specific question with City of Mesa Planning.

## Credits

- Zoning geometry & codes © City of Mesa GIS.
- Basemaps: satellite imagery © Esri/Maxar; street map © OpenStreetMap contributors, © CARTO.
- Photos via Wikimedia Commons under Creative Commons licenses (see captions on each card).
- Map rendering by [Leaflet](https://leafletjs.com/).
