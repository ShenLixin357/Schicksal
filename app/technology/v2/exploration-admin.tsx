'use client';
import {useEffect,useState} from 'react';
import {HintAdmin} from './hint-admin';
import {guideRequest} from '../../guide/guide-panel';
type Report={total:number;coverage:string;entries:{id:string;title:string;region:string;kind:string;count:number}[];unknownRecords:number};
export function ExplorationAdmin(){const [data,D]=useState<Report|null>(null),[error,E]=useState('');async function load(){E('');try{D(await guideRequest<Report>('/api/technology/exploration'))}catch(e){D(null);E(String(e))}}useEffect(()=>{void load()},[]);return <section className="mv2-panel"><h3>探索系统监察</h3><p>仅登记已接入的互动。发现记录是个人探索记忆，不授予卡牌、成就、积分或额外权限。此页只显示汇总，不显示成员明细。</p><button onClick={()=>void load()}>刷新</button>{error&&<p role="alert">{error}</p>}{data&&<><p>已登记 {data.total} 项 · 已有探索记录的项目 {data.entries.filter(x=>x.count>0).length} 项 · 遗留未知记录 {data.unknownRecords}</p><div className="mv2-table"><table><thead><tr><th>已登记探索</th><th>区域</th><th>类型</th><th>发现人数</th></tr></thead><tbody>{data.entries.map(x=><tr key={x.id}><th>{x.title}</th><td>{x.region}</td><td>{x.kind==='visit'?'区域探索':'互动'}</td><td>{x.count}</td></tr>)}</tbody></table></div></>}<HintAdmin/></section>}
