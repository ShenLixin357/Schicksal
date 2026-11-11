"""Stage the compiled engine, provenance and exact adapter sources; no retail art."""
from pathlib import Path
import hashlib
import json
import shutil
import sys

project, source, build = (Path(x).resolve() for x in sys.argv[1:])
target = project / "public/games/insaniquarium/engine"
target.mkdir(parents=True, exist_ok=True)
manifest = json.loads((project / "ports/insaniquarium/upstream.lock.json").read_text())
manifest["sha256"] = {}
for name in ("insaniquarium.mjs", "insaniquarium.wasm"):
    data = (build / "engine" / name).read_bytes()
    (target / name).write_bytes(data)
    manifest["sha256"][name] = hashlib.sha256(data).hexdigest()
shutil.copyfile(source / "LICENSE", target / "LICENSE-AGPL-3.0.txt")
(target / "build.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"staged": str(target), "sha256": manifest["sha256"]}, indent=2))
