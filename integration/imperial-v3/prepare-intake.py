#!/usr/bin/env python3
"""Verify V2.5 handoff and prepare a separate local R4 worktree. Never push/deploy/migrate."""
import argparse, hashlib, importlib.util, io, pathlib, shutil, stat, subprocess, tempfile, zipfile
BASE = 'e5452b4517435c25004d15299d060c8f149ed0c8'
PACKAGES = {
    'Schicksal_Library_Integration_Candidate_R4_2026-11-27.zip': '70686764664fd6f328717612437fe824319ab801a2380fe3bfb9045b7be7c646',
    'Schicksal_Library_V1_1_V1_4_Smart_Collection_Increment_2026-11-27.zip': '4138b810d14bcf855666cf0fdb0f019f9239c3c6eb1744c155873bb17b2c0db8',
    'Schicksal_Ministry_V2_0_Control_Center_Alpha_2026-11-27.zip': 'e57fe8e8c002503a9f82e5fb99b985925d8b74ca30d625d7aa10d15b308e9b05',
    'Schicksal_Search_V2_5_Imperial_Operations_Increment_2026-11-27.zip': '8d7ee36038a81e77ccdb5ce828dc587b585a029b50151a1dbe18d10fb85bb148',
}
ROOTS = ('library-v11-v14-increment', 'schicksal-ministry-v2', 'schicksal-search-v25')

def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args], text=True).strip()

def module(path):
    spec = importlib.util.spec_from_file_location('intake_patch', path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

def extract(bundle, stage):
    with zipfile.ZipFile(bundle) as outer:
        for name, digest in PACKAGES.items():
            raw = outer.read(name)
            if hashlib.sha256(raw).hexdigest() != digest:
                raise ValueError('Package hash mismatch: ' + name)
            with zipfile.ZipFile(io.BytesIO(raw)) as z:
                if z.testzip(): raise ValueError('Corrupt ZIP: ' + name)
                for f in z.infolist():
                    p = pathlib.PurePosixPath(f.filename)
                    if p.is_absolute() or '..' in p.parts or '\\' in f.filename or stat.S_ISLNK(f.external_attr >> 16):
                        raise ValueError('Unsafe ZIP member')
                    if (stage / p).exists() and not f.is_dir(): raise ValueError('Duplicate ZIP member')
                    z.extract(f, stage)
    seen = set()
    for name in ROOTS:
        for p in (stage / name / 'overlay').rglob('*'):
            if not p.is_file(): continue
            rel = p.relative_to(stage / name / 'overlay')
            if rel in seen: raise ValueError('Overlay conflict: ' + str(rel))
            seen.add(rel)
    print(f'Four package hashes and CRCs verified; {len(seen)} disjoint overlay paths.')

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('bundle', type=pathlib.Path)
    ap.add_argument('--repo', type=pathlib.Path)
    ap.add_argument('--worktree', type=pathlib.Path)
    ap.add_argument('--verify-only', action='store_true')
    a = ap.parse_args()
    with tempfile.TemporaryDirectory(prefix='imperial-intake-') as d:
        stage = pathlib.Path(d)
        extract(a.bundle.resolve(), stage)
        if a.verify_only: return
        if not a.repo or not a.worktree: ap.error('--repo and --worktree required')
        repo, root = a.repo.resolve(), a.worktree.resolve()
        if root.exists() or git(repo, 'branch', '--list', 'feature/library-v11-local', 'local/imperial-v3-intake'):
            raise ValueError('Worktree or intake branch already exists; preserve it for review')
        if git(repo, 'rev-parse', BASE) != BASE: raise ValueError('Missing exact R4 commit')
        git(repo, 'worktree', 'add', '--detach', str(root), BASE)
        # Original library guard checks clean exact R4 and creates its own branch.
        subprocess.run(['python3', str(stage / ROOTS[0] / 'apply-v11-local.py'), str(root)], check=True)
        git(root, 'branch', '-m', 'local/imperial-v3-intake')
        # Ministry's original CLI requires a clean checkout, which conflicts with
        # the intentional library overlay. Retain every per-file baseline guard.
        m = module(stage / ROOTS[1] / 'apply-ministry-local.py')
        changes = {}
        for path, digest in m.BASES[BASE].items():
            if git(root, 'hash-object', path) != digest: raise ValueError('Ministry baseline mismatch: ' + path)
            changes[path] = m.transform(path, (root / path).read_text())
        overlay = stage / ROOTS[1] / 'overlay'
        files = [p for p in overlay.rglob('*') if p.is_file()]
        for p in files:
            dest = root / p.relative_to(overlay)
            if dest.exists() or any(x.is_symlink() for x in (dest, *dest.parents)): raise ValueError('Unsafe overlay destination: ' + str(dest))
        for path, value in changes.items(): (root / path).write_text(value)
        for p in files:
            dest = root / p.relative_to(overlay)
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(p, dest)
        search = module(stage / ROOTS[2] / 'apply-search-local.py')
        print('Search preflight:', search.apply(root, True))
        print('Search applied:', search.apply(root, False))
        v3_policy = module(pathlib.Path(__file__).resolve().parent / 'foundation' / 'apply-v3-policy.py')
        print('V3 policy preflight:', v3_policy.apply(root, True))
        print('V3 policy hooked:', v3_policy.apply(root, False))
        gallery = module(pathlib.Path(__file__).resolve().parent / 'foundation' / 'apply-gallery-unification.py')
        print('Gallery merge preflight:', gallery.apply(root, True))
        print('Gallery merged:', gallery.apply(root, False))
        v32 = module(pathlib.Path(__file__).resolve().parent / 'foundation' / 'apply-v32.py')
        print('V3.2 preflight:', v32.apply(root, True))
        print('V3.2 hooks:', v32.apply(root, False))
        # Preserve proposals outside active migrations. The original bundle stays
        # external: duplicating TS fixtures in the app tree can break typechecking.
        support = root / 'integration' / 'imperial-v3' / 'support'
        if support.exists(): raise ValueError('Support destination exists')
        for name in ROOTS:
            source = stage / name
            dest = support / name
            dest.mkdir(parents=True)
            shutil.copy2(source / 'README.md', dest / 'README.md')
            for folder in ('sql', 'proposals'):
                if not (source / folder).exists(): continue
                (dest / folder).mkdir()
                for proposal in (source / folder).glob('*.sql'):
                    shutil.copy2(proposal, dest / folder / proposal.name)
                if folder == 'sql' and (source / folder / 'seed-local.json').is_file():
                    shutil.copy2(source / folder / 'seed-local.json', dest / folder / 'seed-local.json')
        shutil.copy2(stage / ROOTS[2] / 'docs' / 'V2.5-DELIVERY.md', support / 'V2.5-DELIVERY.md')
        print('Local candidate prepared; review git status/diff and build before committing.')
        print('No push, SQL execution, activation, deployment or production change.')
        print('Keep the worktree private. Never push its contents to a public repository.')

if __name__ == '__main__': main()
