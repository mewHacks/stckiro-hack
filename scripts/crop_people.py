"""Crop the 5x2 grid of profile photos into one square avatar per victim ID.

Usage: backend/.venv/bin/python scripts/crop_people.py   (needs Pillow)
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT.parent / "frontend/public/people"
# grid order, left→right, top→bottom (IDs match frontend/src/lib/data.ts)
IDS = ["FS-2041", "FS-1187", "FS-0932", "FS-3310", "FS-0458",
       "FS-2210", "FS-1903", "FS-0771", "FS-3055", "FS-1420"]
X0, Y0, TW, TH, GX, GY = 9, 9, 345, 430, 8, 9  # tile origin/size/gaps in px

img = Image.open(ROOT / "people-grid.png").convert("RGB")
OUT.mkdir(parents=True, exist_ok=True)
for i, pid in enumerate(IDS):
    x = X0 + (i % 5) * (TW + GX)
    y = Y0 + (i // 5) * (TH + GY)
    # square from the top of the tile: keeps the face, drops the name caption
    img.crop((x, y, x + TW, y + TW)).resize((512, 512), Image.LANCZOS).save(OUT / f"{pid}.jpg", quality=90)
    print("saved", pid)
