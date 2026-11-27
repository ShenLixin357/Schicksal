'use client';
import {useEffect,useState,useRef} from 'react';
type Item={kind:string;entity:string;version:string;revision:number;state:string;at:number;reason:string;author:string;category:string;read_at:number|null};
type Data={mode:string;unread:number;items:Item[];limit:number};
const key=(x:Item)=>[x.kind,x.entity,x.version,x.revision].join(':');
const states:Record<string,string>={pending:'待审核',approved:'已正式上架',rejected:'已下架，原件保留'};
export function ReviewNotices({minister=false}:{minister?:boolean}){
 const [data,D]=useState<Data|null>(null),[status,S]=useState('正在读取馆藏通知…'),[busy,B]=useState('');const job=useRef<AbortController|null>(null);
 async function load(){job.current?.abort();const a=new AbortController();job.current=a;try{const r=await fetch('/api/review-notices',{cache:'no-store',credentials:'same-origin',signal:a.signal});if(r.status===404){if(!a.signal.aborted){D(null);S('馆藏审核通知尚未开放。')}return}if(!r.ok)throw Error('通知暂不可用');const j=await r.json() as Data;if(!a.signal.aborted){if(j.mode!==(minister?'technology':'citizen'))throw Error('当前账号模式不匹配');D(j);S('')}}catch(e){if(!a.signal.aborted){D(null);S(String(e))}}}
 useEffect(()=>{D(null);S('正在读取馆藏通知…');void load();return()=>job.current?.abort()},[minister]);
 async function mark(x:Item){if(busy)return;B(key(x));try{const r=await fetch('/api/review-notices',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:x.kind,entity:x.entity,version:x.version,revision:x.revision})});if(!r.ok)throw Error('未能标记已阅');await load()}catch(e){S(String(e))}finally{B('')}}
 return <section className={minister?'mv2-panel':'personal-achievements'} aria-label="馆藏通知"><h3>{minister?'馆藏审核待办':'我的馆藏通知'}</h3><p>{minister?'已阅不代表审核完成，待审核作品仍会保留在待办中。':'审核结果按真实版本显示，仅本人可见。'}</p><button disabled={!!busy} onClick={()=>void load()}>刷新</button>{status&&<p role="status">{status}</p>}{data&&<><p>未读 {data.unread} 项 · 最多显示 {data.limit} 项</p>{!data.items.length&&<p>暂无记录。</p>}{data.items.map(x=><article key={key(x)}><strong>{states[x.state]||x.state} · {x.category}</strong><p>{x.kind} / {x.entity} · 版本 {x.version}</p>{minister&&<p>提交者 {x.author}</p>}<p>{x.reason} · {new Date(x.at*1000).toLocaleString()}</p><button disabled={!!busy||x.read_at!==null} onClick={()=>void mark(x)}>{x.read_at!==null?'已阅':'标记已阅'}</button></article>)}</>}</section>;
}
