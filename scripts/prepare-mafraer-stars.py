"""Build a compact, local HYG 4.1 derivative; never synthesize missing stars.

Usage: python scripts/prepare-mafraer-stars.py /absolute/path/hygdata_v41.csv
Download source: https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv
Data by David Nash / AstroNexus, CC BY-SA 4.0. Application code is independent.
"""

import csv
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

source = Path(sys.argv[1])
destination = Path(__file__).resolve().parents[1] / "public/data"
destination.mkdir(parents=True, exist_ok=True)
records = []
names = {}
with source.open(newline="") as handle:
    for star in csv.DictReader(handle):
        if not star["mag"] or int(star["id"]) == 0 or float(star["mag"]) > 9.5:
            continue
        # Normalize HYG's J2000 Cartesian position and velocity by the same
        # distance. This preserves the supplied proper/radial motion without
        # guessing a convention for the catalogue's RA proper-motion field.
        position = [float(star[axis]) for axis in ("x", "y", "z")]
        distance = math.sqrt(sum(value * value for value in position))
        if not math.isfinite(distance) or distance <= 0:
            continue
        velocity = [float(star[axis] or 0) / distance for axis in ("vx", "vy", "vz")]
        record = [int(star["id"]), int(star["hip"] or 0),
                  *[value / distance for value in position], *velocity,
                  float(star["mag"]), float(star["ci"]) if star["ci"] else 0.3]
        if not all(math.isfinite(value) for value in record):
            raise ValueError(f"Invalid catalogue record {star['id']}")
        records.append(record)
        if star["proper"] or star["bf"]:
            names[star["id"]] = {"name": star["proper"], "designation": star["bf"], "constellation": star["con"]}

records.sort(key=lambda star: (star[8], star[0]))
with (destination / "mafraer-hyg-v41.bin").open("wb") as handle:
    handle.write(struct.pack("<4sIII", b"MSKY", 1, len(records), 10))
    for record in records:
        handle.write(struct.pack("<10f", *record))

metadata = {
    "catalogue": "HYG v4.1", "author": "David Nash / AstroNexus",
    "source": "https://github.com/astronexus/HYG-Database/blob/main/hyg/CURRENT/hygdata_v41.csv",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "license": "CC BY-SA 4.0", "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
    "epoch": "J2000.0", "magnitudeLimit": 9.5, "starCount": len(records),
    "fields": ["hygId", "hipId", "x", "y", "z", "vx", "vy", "vz", "magnitude", "colorIndex"],
    "changes": "Magnitude-limited, field-reduced, distance-normalized, little-endian float32 derivative. Missing colour indices use neutral 0.3 for rendering only.",
    "names": names,
}
(destination / "mafraer-hyg-v41.json").write_text(json.dumps(metadata, separators=(",", ":")) + "\n")
print(f"Prepared {len(records):,} real stars, {len(names):,} named/designated entries.")

