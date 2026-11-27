"use client";
import {useEffect,useState} from "react";
import "./personal-achievements.css";
type Award={id:string;title:string;description:string;explanation:string;unlockedAt:number};
type Data={achievements:Award[];cardProducerReady:boolean};
export function PersonalAchievements({identity}:{identity:string}){
 const [data,D]=useState<Data|null>(null),[state,S]=useState<"loading"|"disabled"|"error"|"ready">("loading"),[retry,R]=useState(0);
 useEffect(()=>{const a=new AbortController();D(null);S("loading");fetch("/api/achievements",{cache:"no-store",credentials:"same-origin",signal:a.signal}).then(async r=>{if(r.status===404)return null;if(!r.ok)throw Error();return await r.json() as Data;}).then(x=>{if(a.signal.aborted)return;D(x);S(x?"ready":"disabled")}).catch(()=>{if(!a.signal.aborted)S("error")});return()=>a.abort()},[identity,retry]);
 return <section className="personal-achievements" aria-label="个人成就"><header><small>IMPERIAL ACHIEVEMENTS</small><h3>我的成就</h3></header>{state==="loading"?<p role="status">正在读取成就记录…</p>:state==="disabled"?<p>成就系统尚未开放。</p>:state==="error"?<p role="alert">成就记录暂不可用。<button type="button" onClick={()=>R(x=>x+1)}>重新读取</button></p>:<><p>已解锁 {data?.achievements.length??0} 项成就。未解锁的秘密不会提前显示。</p>{data?.achievements.map(a=><article key={a.id}><small>{new Date(a.unlockedAt).toLocaleDateString()}</small><h4>{a.title}</h4><p>{a.description}</p><details><summary>成就记忆</summary><p>{a.explanation}</p></details></article>)}{!data?.cardProducerReady&&<p className="personal-achievements-note">卡牌成就的真实事件联动尚未启用；不会通过普通探索互动或测试数据发放。</p>}</>}</section>;
}
