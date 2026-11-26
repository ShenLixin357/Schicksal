#!/usr/bin/env bash
set -euo pipefail
test "$GITHUB_REPOSITORY" = "ShenLixin357/Schicksal"
mkdir -p "$RUNNER_TEMP/library-r4-report" "$RUNNER_TEMP/library-r4"
python3 - <<'PY'
import hashlib,pathlib,zipfile,os
files=list(pathlib.Path("intake").glob("Schicksal_Library_Integration_Candidate_R4_2026-11-27*.zip"))
assert len(files)==1
assert hashlib.sha256(files[0].read_bytes()).hexdigest()==os.environ["R4_ZIP_SHA"]
with zipfile.ZipFile(files[0]) as z:
    assert len(z.infolist())==161
    assert sum(x.file_size for x in z.infolist())==12119581
    for item in z.infolist():
        p=pathlib.PurePosixPath(item.filename)
        assert not p.is_absolute() and ".." not in p.parts and p.parts[0]=="library-candidate"
        assert (item.external_attr>>16)&0o170000 != 0o120000
    z.extractall(pathlib.Path(os.environ["RUNNER_TEMP"])/"library-r4")
print("PASS exact R4 archive")
PY
