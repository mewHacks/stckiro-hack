"""Seed demo victims through the public API (every row goes through the same validation as the app).

Usage: start the API, then `.venv/bin/python seed.py` (add --force to seed again). API_URL defaults to http://localhost:8000.
"""
import math, os, sys, time

import httpx

API = os.getenv("API_URL", "http://localhost:8000")
C_LAT, C_LNG = 3.0738, 101.5183  # same map centre as the frontend (frontend/src/lib/data.ts)


def latlng(x, y):  # frontend map units → real coordinates (100 units ≈ 1 km)
    return C_LAT - (y - 250) / 100 / 111.32, C_LNG + (x - 200) / 100 / (111.32 * math.cos(math.radians(C_LAT)))


# Nearby victims who have NOT pressed SOS: reason stays empty, so the rescuer dashboard does not list them.
# They only show on a victim's own radar. A row becomes an SOS (a priority on the dashboard) when the app sends a reason.
PEOPLE = [
    ("Aisyah R.", "FS-2041", 150, 210), ("Kumar S.", "FS-1187", 175, 240), ("Lim W.", "FS-0932", 255, 300),
    ("Nurul H.", "FS-3310", 130, 250), ("Tan K.", "FS-0458", 300, 160), ("Farid A.", "FS-2210", 110, 300),
    ("Mei Ling C.", "FS-1903", 230, 330), ("Ravi P.", "FS-0771", 200, 200), ("Siti Z.", "FS-3055", 60, 420),
    ("Hafiz M.", "FS-1420", 340, 210),
]

with httpx.Client(base_url=API, timeout=10) as c:
    if c.get("/api/victims").json() and "--force" not in sys.argv:
        sys.exit("victims already present; re-run with --force to add the demo set again")
    now = int(time.time() * 1000)
    for i, (name, bag, x, y) in enumerate(PEOPLE):
        lat, lng = latlng(x, y)
        body = {"bag": bag, "at": now - i * 1000, "reason": "", "priority": "high",
                "profile": {"name": name}, "location": {"lat": lat, "lng": lng, "accuracyM": 5}, "beacon": {"connected": True}}
        c.post("/api/sos", json=body).raise_for_status()
    print(f"seeded {len(PEOPLE)} nearby victims (not SOS)")
