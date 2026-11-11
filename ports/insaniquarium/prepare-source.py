"""Generate the native port with consistent line endings and original controls."""
from pathlib import Path
import os
import re
import subprocess
import sys

root = Path(sys.argv[1]).resolve()
destination = Path(sys.argv[2]).resolve()
destination.mkdir(parents=True, exist_ok=True)
source = root / "external/winfish/source/WinFish"
for path in source.iterdir():
    if path.suffix in (".cpp", ".h", ".rc", ".ico", ".xml"):
        data = path.read_bytes()
        if path.suffix in (".cpp", ".h"):
            data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
        (destination / path.name).write_bytes(data)
script = root / "port/port.sh"
text = script.read_text()
text = text.replace('if [ -f "$ROOT/port/fixups/apply-portfeatures.py" ]; then', 'if false; then # Schicksal: keep original controls; no auto-collect additions')
script.write_text(text)
result = subprocess.run(["bash", str(script)], env={**os.environ, "WINFISH_SRC": str(destination)}, capture_output=True, text=True)
print(result.stdout)
print(result.stderr, file=sys.stderr)
if result.returncode or re.search(r"\[FAILED\]|WARNING:|Traceback", result.stdout + result.stderr):
    raise SystemExit("Native source preparation failed; refusing to build a partially patched game.")
