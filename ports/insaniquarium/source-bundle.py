"""Bundle matching engine sources for the build artifact, excluding game assets."""
from pathlib import Path
import sys
import tarfile

project, source, output = (Path(x).resolve() for x in sys.argv[1:])
excluded = {".git", "bin", "build", "android", "examples", "tools"}
def include(info):
    parts = Path(info.name).parts
    # libopenmpt/build holds the generated metadata required to rebuild.
    if any(p == ".git" for p in parts) or ".git" in Path(info.name).name:
        return None
    if any(p in excluded - {".git", "build"} for p in parts):
        return None
    if "build" in parts and "libopenmpt" not in parts:
        return None
    if Path(info.name).suffix in {".log", ".wasm", ".mjs", ".exe", ".dll", ".o", ".a"}:
        return None
    info.uid = info.gid = 0; info.uname = info.gname = ""
    return info
output.parent.mkdir(parents=True, exist_ok=True)
with tarfile.open(output, "w:gz") as archive:
    archive.add(source, arcname="upstream", filter=include)
    archive.add(project / "ports/insaniquarium", arcname="ports/insaniquarium")
print(output)
