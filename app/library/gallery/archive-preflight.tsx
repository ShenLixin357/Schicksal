'use client';
import {useEffect,useRef,useState} from 'react';
import {hashFile} from '../digital/file-digest';
import {BATCH_LIMIT,CATEGORIES,inspectFilename,summarizeEntries,type Category,type ImportEntry} from './archive-plan';
type Row=ImportEntry&{id:string};
const format=(bytes:number)=>bytes>=1024**3?(bytes/1024**3).toFixed(2)+' GiB':bytes>=1024**2?(bytes/1024**2).toFixed(1)+' MiB':(bytes/1024).toFixed(1)+' KiB';
export function ArchivePreflight(){
 const [open,setOpen]=useState(false),[rows,setRows]=useState<Row[]>([]),[project,setProject]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[progress,setProgress]=useState(''),[drag,setDrag]=useState(false);
 const work=useRef<AbortController|null>(null);
 useEffect(()=>()=>work.current?.abort(),[]);
 async function inspect(files:File[]){
  if(work.current||!files.length)return;
  if(files.length+rows.length>BATCH_LIMIT){setMessage('每批最多 '+BATCH_LIMIT+' 个文件，请分批处理。');return;}
  const a=new AbortController();work.current=a;setBusy(true);setMessage('');const next:Row[]=[];
  try{
   for(const [i,file] of files.entries()){
    a.signal.throwIfAborted();const info=inspectFilename(file.name,file.size);let sha256:string|null=null,reason=info.reason;
    if(!reason){try{sha256=await hashFile(file,a.signal,(n,total)=>setProgress((i+1)+'/'+files.length+' · '+file.name+' · '+Math.floor(n/total*100)+'%'));}catch(e){if(a.signal.aborted)throw e;reason='无法计算原件指纹';}}
    next.push({id:crypto.randomUUID(),name:file.name,bytes:file.size,sha256,category:info.category,route:info.route,media:info.media,reason,project:project.trim().slice(0,100)});
   }
  }catch{if(!a.signal.aborted)setMessage('部分文件未能完成检查。');}
  finally{if(work.current===a){work.current=null;setRows(old=>[...old,...next]);setBusy(false);setProgress('');if(a.signal.aborted)setMessage('检查已停止，保留已完成的记录。');}}
 }
 const totals=summarizeEntries(rows),seen=new Set<string>();
 function exportPlan(){
  const data={schema:'schicksal-archive-preflight-v1',createdAt:new Date().toISOString(),status:'local-only-not-uploaded',entries:rows.map(({id,...entry})=>entry),summary:totals};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='schicksal-archive-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 return <section className="gallery-archive-preflight"><header><div><small>ARCHIVE · IMPORT</small><h3>美术档案批量导入</h3><p>ZIP、原图、设计文档一起整理。先在本机检查，不会上传文件。</p></div><button type="button" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'收起':'整理待归档文件'}</button></header>
 {open&&<div className="archive-preflight-body">
 <label>关联作品／项目（可选）<input value={project} maxLength={100} disabled={busy} onChange={e=>setProject(e.target.value)} placeholder="例如 The Witch’s Perihelion"/></label>
 <label className={'archive-drop'+(drag?' is-dragging':'')} onDragOver={e=>{e.preventDefault();if(!busy)setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);if(!busy)void inspect(Array.from(e.dataTransfer.files))}}>
 <strong>拖入文件，或点击选择</strong><span>每批最多 100 个 · 原件不会修改 · 当前仅预检</span><input aria-label="选择待归档文件" type="file" multiple disabled={busy} onChange={e=>{const f=Array.from(e.target.files??[]);e.currentTarget.value='';void inspect(f)}}/></label>
 <p role="status">{progress||message}</p>{busy&&<button type="button" onClick={()=>work.current?.abort()}>停止检查</button>}
 {rows.length>0&&<><div className="archive-totals"><span>共 <strong>{rows.length}</strong> 个</span><span>原件 <strong>{format(totals.bytes)}</strong></span><span>本批重复 <strong>{totals.duplicates}</strong></span><span>唯一候选 <strong>{format(totals.uniqueBytes)}</strong></span><span>暂不可导入 <strong>{totals.blocked}</strong></span></div>
 <div className="archive-rows">{rows.map(row=>{const duplicate=!!row.sha256&&seen.has(row.sha256);if(row.sha256)seen.add(row.sha256);return <div key={row.id} className="archive-row"><div><strong>{row.name}</strong><small>{row.media} · {format(row.bytes)} · {row.reason|| (duplicate?'本批完全重复':'指纹已计算')}</small>{row.sha256&&<small className="archive-hash" title={row.sha256}>SHA-256 {row.sha256.slice(0,16)}…</small>}</div><label>作品性质<select disabled={busy} value={row.category} onChange={e=>setRows(old=>old.map(x=>x.id===row.id?{...x,category:e.target.value as Category}:x))}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>关联项目<input disabled={busy} maxLength={100} value={row.project} onChange={e=>setRows(old=>old.map(x=>x.id===row.id?{...x,project:e.target.value}:x))}/></label><button type="button" disabled={busy} aria-label={'移除 '+row.name} onClick={()=>setRows(old=>old.filter(x=>x.id!==row.id))}>移除</button></div>})}</div>
 <div className="archive-actions"><button type="button" disabled={busy} onClick={exportPlan}>导出预检清单</button><button type="button" disabled={busy} onClick={()=>setRows([])}>清空清单</button></div></>}
 <p className="archive-note">相同 SHA-256 只代表本批内容相同，并未查询云端。格式识别不是安全审核，清单不是备份，不能作为删除电脑原件的依据。真实上传、保全及发布暂未开放。</p></div>}
 </section>;
}
