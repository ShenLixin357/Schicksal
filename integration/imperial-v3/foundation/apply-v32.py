#!/usr/bin/env python3
"""After exact V2.5 intake: apply reviewed public-read, gallery and exploration hooks.
The new runtime modules live on the V3.2 branch; this modifies only imported files.
No migrations, feature activation, remote changes or model calls.
"""
import pathlib, argparse
def rep(s,a,b):
 if s.count(a)!=1:raise ValueError('V3.2 anchor mismatch: '+a[:130])
 return s.replace(a,b,1)
def apply(root,check=False):
 root=pathlib.Path(root); out={}
 def edit(p,fn):out[p]=fn(out.get(p,(root/p).read_text()))
 def add(p,s):
  if (root/p).exists():raise ValueError('Unexpected destination: '+p)
  out[p]=s
 edit('server/gallery/service.ts',lambda s:rep(rep(rep(s,"import {env} from 'cloudflare:workers';","import {env} from 'cloudflare:workers';\nimport {publicReadDb} from '../imperial-v3/public-read.ts';"),"export function configuredGallery(){","export function configuredGallery(readOnly=false){"),"return galleryStore(env.DB,","return galleryStore(readOnly?publicReadDb(env.DB,env):env.DB,"))
 def gallery_route(s):
  s=rep(s,"import {requireMember,requireTechnologyMinister}","import {env} from 'cloudflare:workers';\nimport {galleryReady} from '../../../server/imperial-v3/review.mjs';\nimport {requireMember,requireTechnologyMinister}")
  s=rep(s,"const store=configuredGallery();return Response.json(q.get('stats')","const store=configuredGallery(!trash&&q.get('stats')!=='1');return Response.json(q.get('stats')")
  s=rep(s,"const action=q.get('action');let result:unknown;","const action=q.get('action');if(galleryReady(env)&&['create','version'].includes(action??''))throw new ApiError('请使用统一作品提交入口',409);let result:unknown;")
  return s
 edit('app/api/gallery/route.ts',gallery_route)
 def asset(s):
  s=rep(s,"import {requireMember}","import {env} from 'cloudflare:workers';\nimport {galleryReady} from '../../../../server/imperial-v3/review.mjs';\nimport {requireMember}")
  s=rep(s,"await requireMember(request);const q=","const actor=await requireMember(request);const q=")
  s=rep(s,"configuredGallery().read(","configuredGallery(true).read(")
  s=rep(s,"return new Response(new Uint8Array(result.bytes).buffer,","if(galleryReady(env)&&!await env.DB.prepare('SELECT 1 FROM imperial_visible_gallery_versions v JOIN gallery_works w ON w.id=v.work_id WHERE v.work_id=? AND v.id=? AND w.trashed_at IS NULL').bind(q.get('work'),q.get('version')).first())throw new ApiError('作品已下架',404);if(await requireMember(request)!==actor)throw new ApiError('会话已变化',403);return new Response(new Uint8Array(result.bytes).buffer,")
  return s
 edit('app/api/gallery/asset/route.ts',asset)
 edit('server/library/discovery.ts',lambda s:rep(rep(s,"import {ApiError}","import {env} from 'cloudflare:workers';\nimport {publicReadDb} from '../imperial-v3/public-read.ts';\nimport {ApiError}"),"export function discovery(db:DigitalDB,enabled:Availability){return {","export function discovery(db:DigitalDB,enabled:Availability){db=publicReadDb(db,env);return {"))
 edit('server/search/corpus.ts',lambda s:rep(rep(s,"import {createHash}","import {env} from 'cloudflare:workers';\nimport {publicReadDb} from '../imperial-v3/public-read.ts';\nimport {createHash}"),"Promise<Passage[]>{const out:Passage[]=[];","Promise<Passage[]>{db=publicReadDb(db,env);const out:Passage[]=[];"))
 edit('server/search/visual.ts',lambda s:rep(rep(s,"import {env} from 'cloudflare:workers';","import {env} from 'cloudflare:workers';\nimport {publicReadDb} from '../imperial-v3/public-read.ts';"),"async function rows(history:boolean){const result=(await env.DB.prepare(","async function rows(history:boolean){const result=(await publicReadDb(env.DB,env).prepare("))
 edit('app/library/gallery/gallery-client.ts',lambda s:rep(s,"for(const role of preferPreview?['preview','thumbnail']:['thumbnail','preview'])","for(const role of preferPreview?['preview','thumbnail','original']:['thumbnail','preview','original'])"))
 edit('app/library/gallery/gallery-panel.tsx',lambda s:rep(rep(rep(s,"import {useEffect,useRef,useState}","import {CitizenGalleryUpload} from './citizen-upload';\nimport {useEffect,useRef,useState}"),"const [works,setWorks]","const [works,setWorks]"),"</header><div className=\"gallery-toolbar\">","</header><CitizenGalleryUpload onChanged={()=>setRetry(x=>x+1)}/><div className=\"gallery-toolbar\">"))
 # Personal saves are postponed; preserve stored originals, do not expose stale work details.
 edit('app/api/library/workspace/route.ts',lambda s:rep(rep(rep(s,"import {env} from 'cloudflare:workers';","import {env} from 'cloudflare:workers';\nimport {galleryReady} from '../../../../server/imperial-v3/review.mjs';"),"export async function GET(request:Request){try{","export async function GET(request:Request){try{if(galleryReady(env))throw new ApiError('个人收藏功能暂缓开放',404);"),"export async function POST(request:Request){try{","export async function POST(request:Request){try{if(galleryReady(env))throw new ApiError('个人收藏功能暂缓开放',404);"))
 add('app/api/gallery/submit/route.ts',(pathlib.Path(__file__).parent/'gallery-submit.route.template').read_text())
 # Keyword-only until a separately authorized future model activation.
 edit('server/search/settings.ts',lambda s:rep(s,"models:e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'","models:e.SCHICKSAL_FUTURE_AI_APPROVED==='true'&&e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'").replace("answers:e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'","answers:e.SCHICKSAL_FUTURE_AI_APPROVED==='true'&&e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'").replace("autoIndex:e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'","autoIndex:e.SCHICKSAL_FUTURE_AI_APPROVED==='true'&&e.SCHICKSAL_SEARCH_MODELS_ENABLED==='true'"))
 # Integrate split progress into existing authenticated V2.5 service.
 def exploration(s):
  s=rep(s,"import {env} from 'cloudflare:workers';","import {env} from 'cloudflare:workers';\nimport {buildProgress,classifiedEggs,freeHintEggs} from '../imperial-v3/exploration-progress.mjs';")
  s=rep(s,"eggs:EGGS.filter(x=>","eggs:classifiedEggs(EGGS).filter((x:Egg)=>")
  a=s.index('export async function progress(');b=s.index('export async function hint(',a)
  s=s[:a]+"export async function progress(r:Request){const c=await context(r),rows=new Map((await seen(c.actor)).map(x=>[x.egg_id,x.first_seen_at]));return buildProgress(c.eggs,rows);}\n"+s[b:]
  s=rep(s,"const remaining=c.eggs.filter(x=>!ids.has(x.id));","const remaining=freeHintEggs(c.eggs).filter((x:Egg)=>!ids.has(x.id));")
  return s
 edit('server/exploration/service.ts',exploration)
 edit('app/guide/exploration.tsx',lambda s:rep(rep(s,"type Progress={coverage:string;","type Progress={hidden?:{total:number;unlocked:number;percent:number|null};limited?:{id:string;title:string;status:string;total:number;unlocked:number}[];coverage:string;"),"<h4>已发现的记忆</h4>","<h4>特殊隐藏探索</h4>{data.hidden&&<p>{data.hidden.percent===null?'暂无登记':data.hidden.percent+'%'} · {data.hidden.unlocked}/{data.hidden.total}</p>}<h4>限时活动</h4>{!data.limited?.length?<p>暂无已登记活动。</p>:data.limited.map(e=><p key={e.id}>{e.title} · {e.unlocked}/{e.total} · {e.status}</p>)}<h4>基础探索记忆</h4>"))
 # Light editorial styling; preserve original asset and compare controls.
 edit('app/library/gallery/gallery.css',lambda s:s+'''
.schicksal-gallery-v12{background:#f7f4ed;color:#3b3531;border:0;border-radius:0;padding:clamp(18px,4vw,48px)}
.schicksal-gallery-v12 header small{color:#85735b;letter-spacing:.22em}
.schicksal-gallery-v12 header h2{font-family:Georgia,serif;font-size:clamp(1.7rem,3vw,2.7rem);font-weight:400}
.schicksal-gallery-v12 .gallery-grid{grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr));gap:clamp(18px,3vw,36px)}
.schicksal-gallery-v12 .gallery-grid article{border:0;background:transparent;padding:0 0 14px;border-bottom:1px solid #cabea8}
.schicksal-gallery-v12 .gallery-grid article img{aspect-ratio:4/5;object-fit:contain;background:#eee9de}
.schicksal-gallery-v12 button,.schicksal-gallery-v12 input,.schicksal-gallery-v12 select{background:#fffdf8;color:#493e35;border:1px solid #bdb09a;padding:8px 12px}
.schicksal-gallery-v12 a{color:#775c31}.gallery-citizen-upload{margin:18px 0}.gallery-citizen-upload>div{padding:20px;border:1px solid #c9bba3;display:grid;gap:12px}.gallery-citizen-upload label{display:grid;gap:5px}.gallery-citizen-upload p{margin:0}
''')
 if not check:
  for p,s in out.items():
   target=root/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(s)
 return len(out)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('root',type=pathlib.Path);p.add_argument('--check',action='store_true');a=p.parse_args();print('V3.2 source hooks:',apply(a.root,a.check))
