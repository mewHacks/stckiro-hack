"""Seed demo victims through the public API (every row goes through the same validation as the app).

Usage: start the API, then `.venv/bin/python seed.py` (add --force to seed again). API_URL defaults to http://localhost:8000.
"""
import math, os, sys, time

import httpx

API = os.getenv("API_URL", "http://localhost:8000")
C_LAT, C_LNG = 3.0738, 101.5183  # same map centre as the frontend (frontend/src/lib/data.ts)


def latlng(x, y):  # frontend map units → real coordinates (100 units ≈ 1 km)
    return C_LAT - (y - 250) / 100 / 111.32, C_LNG + (x - 200) / 100 / (111.32 * math.cos(math.radians(C_LAT)))


# name, bag, x, y, priority, reason, via, minutes ago, steps to advance (1 = Assigned, 2 = Rescued)
PEOPLE = [
    ("Aisyah R.", "FS-2041", 150, 210, "critical", "Trapped by rising water", "mesh", 1, 0),
    ("Kumar S.", "FS-1187", 175, 240, "critical", "Medical emergency", "mesh", 3, 0),
    ("Lim W.", "FS-0932", 255, 300, "high", "Need evacuation", "internet", 6, 1),
    ("Nurul H.", "FS-3310", 130, 250, "high", "Injured", "mesh", 9, 0),
    ("Tan K.", "FS-0458", 300, 160, "high", "Need evacuation", "internet", 14, 2),
    ("Farid A.", "FS-2210", 110, 300, "critical", "Trapped by rising water", "mesh", 2, 0),
    ("Mei Ling C.", "FS-1903", 230, 330, "high", "Elderly / child with me", "internet", 4, 0),
    ("Ravi P.", "FS-0771", 200, 200, "high", "Need evacuation", "internet", 7, 0),
    ("Siti Z.", "FS-3055", 60, 420, "high", "Elderly / child with me", "mesh", 11, 0),
    ("Hafiz M.", "FS-1420", 340, 210, "high", "Injured", "internet", 18, 1),
]

with httpx.Client(base_url=API, timeout=10) as c:
    if c.get("/api/victims").json() and "--force" not in sys.argv:
        sys.exit("victims already present; re-run with --force to add the demo set again")
    now = int(time.time() * 1000)
    for name, bag, x, y, pri, reason, via, mins, _ in PEOPLE:
        lat, lng = latlng(x, y)
        body = {"bag": bag, "at": now - mins * 60_000, "reason": reason, "priority": pri, "battery": 60,
                "profile": {"name": name}, "location": {"lat": lat, "lng": lng, "accuracyM": 5}, "beacon": {"connected": True}}
        c.post(f"/api/sos?via={via}", json=body).raise_for_status()
    ids = {v["name"]: v["id"] for v in c.get("/api/victims").json()}
    for name, *_, steps in PEOPLE:
        for _ in range(steps):
            c.patch(f"/api/victims/{ids[name]}").raise_for_status()
    print(f"seeded {len(PEOPLE)} victims")
