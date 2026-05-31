"""
Fetch Mesa zoning district polygons from the City of Mesa ArcGIS REST service and
save them as a simplified GeoJSON used by the interactive map.

Source layer: Planning/ZoningOverlay/MapServer/1 ("Zoning") — the polygon layer behind
the public Planning & Zoning interactive map. ~8,000 features; the "Zoning" attribute
holds the district code (RS-6, GC, LI, DB-1, ...).

Usage:  python scripts/fetch_zoning.py   (writes data/mesa_zoning.geojson)
"""
import urllib.request, json, time, os
BASE="https://gis.mesaaz.gov/mesaaz/rest/services/Planning/ZoningOverlay/MapServer/1/query"
features=[]
offset=0
step=1000
while True:
    url=(f"{BASE}?where=1%3D1&outFields=Zoning,Description,Acres&returnGeometry=true"
         f"&outSR=4326&geometryPrecision=5&maxAllowableOffset=0.00004"
         f"&resultRecordCount={step}&resultOffset={offset}&f=geojson")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                d=json.load(r)
            break
        except Exception as e:
            print("retry",offset,e); time.sleep(3)
    else:
        raise SystemExit("failed at "+str(offset))
    fs=d.get("features",[])
    features.extend(fs)
    print("offset",offset,"got",len(fs),"total",len(features))
    if len(fs)<step: break
    offset+=step
fc={"type":"FeatureCollection","features":features}
os.makedirs("data",exist_ok=True)
json.dump(fc, open("data/mesa_zoning.geojson","w"), separators=(",",":"))
print("TOTAL",len(features),"bytes",os.path.getsize("data/mesa_zoning.geojson"))
