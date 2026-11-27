#!/usr/bin/env python3
"""Post-V2.5 exact-source hook. No migration, deployment or flag activation."""
import argparse,hashlib,pathlib,subprocess
HASHES={
 'server/ministry/store.ts':'c3f54f8b866540568aedc46735bd440cf18b471a',
 'server/search/service.ts':'2b9ca7dbeef4b1beea4ab8aca69c3499fc973f9d',
}
def replace(s,a,b):
 if s.count(a)!=1:raise ValueError('Unexpected V3 policy anchor: '+a[:120])
 return s.replace(a,b)
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def apply(root,check=False):
 out={}
 for path,h in HASHES.items():
  p=root/path
  if p.is_symlink() or blob(p.read_bytes())!=h:raise ValueError('V2.5 policy baseline mismatch: '+path)
  s=p.read_text()
  if path=='server/ministry/store.ts':
   s=replace(s,"import {env} from 'cloudflare:workers';","import {env} from 'cloudflare:workers';\nimport {combineRestriction} from '../imperial-v3/policy-runtime.mjs';")
   s=replace(s,"return {mode:(a?.payload.mode??'open') as Mode,policy:(b?.payload.policy??'inherit') as Policy};","const policy=await combineRestriction(env.DB,env,id,f,(b?.payload.policy??'inherit') as Policy) as Policy;return {mode:(a?.payload.mode??'open') as Mode,policy};")
  else:
   s=replace(s,"import {normalize} from '../ministry/store.ts';\nimport type {Mode,Policy} from '../ministry/policy.ts';","import {accessSettings} from '../ministry/store.ts';")
   start=s.index('const controls=(await env.DB.prepare("SELECT kind,target,payload FROM ministry_current')
   end=s.index('export async function executeSearch(',start)
   s=s[:start]+"""const resources=['library','archives','gallery','digital'] as const;const settingsByFeature=await Promise.all(resources.map(f=>accessSettings(actor,f)));const can=(f:typeof resources[number])=>{const p=settingsByFeature[resources.indexOf(f)];return decide(p.mode,p.policy,'GET',session.accountMode==='technology').allowed;};return {book:available.book&&can('library')&&can('archives'),gallery:available.gallery&&can('gallery'),digital:available.digital&&can('digital')};}
"""+s[end:]
  out[path]=s
 if not check:
  for path,s in out.items():(root/path).write_text(s)
 return len(out)
if __name__=='__main__':
 ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('root',type=pathlib.Path);ap.add_argument('--check',action='store_true');a=ap.parse_args()
 if not a.check:
  branch=subprocess.check_output(['git','-C',str(a.root),'branch','--show-current'],text=True).strip()
  if not branch or branch in ('main','master'):raise SystemExit('Require isolated candidate branch')
 print('V3 exact policy files:',apply(a.root,a.check))
