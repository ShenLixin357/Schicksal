"use client";
import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { CITIZENS, type Citizen } from "../citizens";
import {
 ATLAS_APPEARANCE, ATLAS_SHARED_EMBLEM_SRC, ATLAS_OFFICES,
 ATLAS_COMMITTEE_IDS, ATLAS_YOUTH_IDS,
 atlasCodename, atlasColor, atlasName, atlasOfficesForCitizen
} from "./atlas-data";
import "./atlas.css";

const sharedColors=["#f4d269","#91c9f4","#e8787d","#7acb91","#c3e9f0","#e7b1cf","#e9a866","#b897df"];

/** A real replaceable emblem component; the main screenshot is only the decorative scene. */
export function AtlasGemGlyph({ colors=sharedColors, size=38, className="" }: {colors?:readonly string[],size?:number,className?:string}) {
 const count=colors.length;
 return <svg className={className} width={size} height={size} viewBox="-150 -150 300 300" aria-hidden="true" role="presentation">
  <defs><linearGradient id={"atlas-facet-gradient-"+count} x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#fffdf8"/><stop offset="48%" stopColor="#ffffff" stopOpacity=".0"/><stop offset="100%" stopColor="#573c78" stopOpacity=".45"/></linearGradient></defs>
  {colors.map((color,i)=><g key={i} transform={"rotate("+(i*360/count)+")"}>
    <path d="M0 -138 L16 -57 L0 -2 L-16 -57 Z" fill={color} stroke="#f9dfb5" strokeWidth="2"/>
    <path d="M0 -138 L16 -57 L0 -2 Z" fill="#ffffff" fillOpacity=".35"/>
    <path d="M0 -138 L-16 -57 L0 -2 Z" fill="#3c377d" fillOpacity=".14"/>
    <path d="M-16 -57 L0 -78 L16 -57 L0 -2 Z" fill="#ffffff" fillOpacity=".12" stroke="#f4e8f3" strokeWidth="1"/>
  </g>)}
  <circle r="7" fill="#fff9db" stroke="#d19c6a" strokeWidth="2"/>
 </svg>;
}

export function AtlasOrganisationGlyph({citizenIds}: {citizenIds:readonly string[]}) {
 const colors=citizenIds.map(id=>atlasColor(CITIZENS.find(c=>c.id===id) ?? CITIZENS[0]));
 return <AtlasGemGlyph colors={colors} size={68} className="atlas-org-glyph"/>;
}

function SmallPersonalGlyph({citizen,large=false}: {citizen:Citizen,large?:boolean}) {
 const asset=ATLAS_APPEARANCE[citizen.id]?.emblemSrc;
 return asset
  ? <Image unoptimized src={asset} width={large?88:42} height={large?88:42} alt="" className="atlas-personal-image" />
  : <AtlasGemGlyph colors={[atlasColor(citizen)]} size={large?83:36} />;
}

type AtlasProps={
 onVisitCitizen:(id:string)=>void;
 onOpenHandbook:()=>void;
 initialCitizenId?:string;
};

export function SchicksalAtlas({onVisitCitizen,onOpenHandbook,initialCitizenId}:AtlasProps){
 const [selectedId,setSelectedId]=useState(initialCitizenId ?? "amberina");
 const [hoverId,setHoverId]=useState<string|null>(null);
 const [expandedOffice,setExpandedOffice]=useState<string|null>(null);
 const selected=CITIZENS.find(c=>c.id===selectedId) ?? CITIZENS[0];
 const currentColor=atlasColor(selected);
 const officialPositions=atlasOfficesForCitizen(selected.id);
 const slotLocations=[
 {left:"52%",top:"11%"},{left:"73%",top:"23%"},{left:"82%",top:"51%"},{left:"73%",top:"80%"},
 {left:"52%",top:"88%"},{left:"31%",top:"80%"},{left:"21%",top:"51%"},{left:"31%",top:"23%"}
 ];
 return <div className="schicksal-atlas" style={{"--atlas-personal":currentColor} as CSSProperties}>
  <header className="atlas-page-heading"><div className="atlas-page-symbol"><AtlasGemGlyph size={34}/></div><div className="atlas-title-text"><h1>天命图谱 <em>Schicksal Atlas</em></h1><p>THE FIRST SCHICKSAL EMPIRE · 八位公民的共同图谱</p></div></header>
  <div className="atlas-upper-grid">
   <section className="atlas-scene-panel" aria-label="八位公民共同构成的星图">
    <Image unoptimized src="/atlas/star-stage.webp" alt="精致的紫蓝彩窗与天文星盘" fill sizes="(max-width:1100px) 100vw, 50vw" className="atlas-scene-art" priority/>
    <span className="atlas-scene-halo" aria-hidden="true"/>
    {ATLAS_SHARED_EMBLEM_SRC && <span className="atlas-central-emblem"><Image unoptimized src={ATLAS_SHARED_EMBLEM_SRC} alt="天命共同标志" width={195} height={195}/></span>}
    {CITIZENS.map((citizen,index)=><button key={citizen.id} type="button"
      className={"atlas-member-node"+((hoverId||selected.id)===citizen.id?" active":"")}
      style={{left:slotLocations[index].left,top:slotLocations[index].top,"--node-color":atlasColor(citizen)} as CSSProperties}
      aria-label={"查看"+atlasCodename(citizen.id)+"的公民档案"}
      aria-pressed={selected.id===citizen.id}
      onPointerEnter={()=>setHoverId(citizen.id)} onPointerLeave={()=>setHoverId(null)}
      onFocus={()=>setHoverId(citizen.id)} onBlur={()=>setHoverId(null)} onClick={()=>setSelectedId(citizen.id)}>
       <span className="atlas-node-tooltip">{atlasCodename(citizen.id)}</span>
     </button>)}
   </section>
   <section className="atlas-record-panel atlas-decorated-panel" aria-label="公民身份档案">
     <Image unoptimized src="/atlas/record-corner-tr.webp" alt="" width={135} height={100} className="atlas-corner atlas-top-right"/>
     <Image unoptimized src="/atlas/record-corner-bl.webp" alt="" width={130} height={95} className="atlas-corner atlas-bottom-left"/>
     <header className="atlas-section-heading"><AtlasGemGlyph colors={[currentColor]} size={27}/><h2>公民档案</h2><em>Citizen Record</em></header>
     <div className="atlas-person-top">
       <div className="atlas-sigil-frame"><SmallPersonalGlyph citizen={selected} large/></div>
       <div className="atlas-person-info"><h3>{atlasName(selected)}</h3>
        <div className="atlas-identity-line"><span>代号</span><strong>{atlasCodename(selected.id)}</strong></div>
        <div className="atlas-identity-line"><span>身份</span><strong>{selected.locked?"档案待开放":"第一帝国公民"}</strong></div>
        {officialPositions.some(o=>o.id==="president") && <span className="atlas-president-badge"><AtlasGemGlyph size={21}/><strong>现任主席</strong></span>}
       </div>
     </div>
     <div className="atlas-roles">
       <div className="atlas-small-title"><span>现任职务</span><small>CURRENT OFFICES</small></div>
       <div className="atlas-role-tags">{officialPositions.length ? officialPositions.map(o=><span key={o.id}><i>✧</i>{o.title}</span>) : <span className="atlas-role-empty">暂无现任公职</span>}</div>
     </div>
     <div className="atlas-record-footer"><button type="button" disabled={Boolean(selected.locked)} onClick={()=>onVisitCitizen(selected.id)}>↗ 访问个人主页</button></div>
     {ATLAS_APPEARANCE[selected.id]?.ornamentSrc && <Image unoptimized src={ATLAS_APPEARANCE[selected.id].ornamentSrc!} alt="" width={214} height={195} className="atlas-person-flower" />}
   </section>
  </div>
  <div className="atlas-lower-grid">
    <section className="atlas-decorated-panel atlas-org-panel" aria-label="帝国组织">
      <Image unoptimized src="/atlas/org-corner-tr.webp" alt="" width={130} height={92} className="atlas-corner atlas-top-right"/>
      <Image unoptimized src="/atlas/org-corner-bl.webp" alt="" width={132} height={94} className="atlas-corner atlas-bottom-left"/>
      <header className="atlas-section-heading"><span className="atlas-heading-icon" aria-hidden="true">♧</span><h2>帝国组织</h2><em>Imperial Organisations</em></header>
      <div className="atlas-org-item">
        <AtlasOrganisationGlyph citizenIds={ATLAS_COMMITTEE_IDS}/>
        <div className="atlas-org-label"><h3>天命委员会</h3><em>The Schicksal Committee</em></div>
        <div className="atlas-org-members"><strong>成员（3 人）</strong><span>{ATLAS_COMMITTEE_IDS.map(atlasCodename).join("、")}</span></div>
      </div>
      <div className="atlas-org-item">
        <AtlasOrganisationGlyph citizenIds={ATLAS_YOUTH_IDS}/>
        <div className="atlas-org-label"><h3>少年自治会</h3><em>Junior Self-Government Council</em></div>
        <div className="atlas-org-members"><strong>成员（5 人）</strong><span>{ATLAS_YOUTH_IDS.map(atlasCodename).join("、")}</span></div>
      </div>
    </section>
    <section className="atlas-decorated-panel atlas-directory-panel" aria-label="帝国公职表">
      <Image unoptimized src="/atlas/office-corner-br.webp" alt="" width={120} height={92} className="atlas-corner atlas-bottom-right"/>
      <header className="atlas-section-heading"><span className="atlas-heading-icon" aria-hidden="true">♜</span><h2>帝国公职表</h2><em>Office Directory</em>
        <button type="button" className="atlas-handbook-button" onClick={onOpenHandbook}>▤ 政务手册</button>
      </header>
      <table className="atlas-offices-table">
        <thead><tr><th scope="col">职务</th><th scope="col">现任人员 · 代号</th></tr></thead>
        <tbody>{ATLAS_OFFICES.map(office=><FragmentOfficeRow key={office.id} office={office} expanded={expandedOffice===office.id} onExpand={()=>setExpandedOffice(expandedOffice===office.id?null:office.id)} onHolder={setSelectedId}/>)}</tbody>
      </table>
      <p className="atlas-duty-note">点击职位查看职责；具体职责文案待批准后正式生效。</p>
    </section>
  </div>
 </div>;
}
function FragmentOfficeRow({office,expanded,onExpand,onHolder}:{office:typeof ATLAS_OFFICES[number];expanded:boolean;onExpand:()=>void;onHolder:(id:string)=>void}) {
 return <>
 <tr><td><button type="button" className="atlas-office-name" aria-expanded={expanded} onClick={onExpand}><span aria-hidden="true">{expanded?"⌄":"›"}</span>{office.title}</button></td>
 <td className="atlas-office-people">{office.holderIds.length?office.holderIds.map((id,i)=><span key={id}>{i>0?"、":""}<button type="button" onClick={()=>{onHolder(id);document.querySelector(".atlas-record-panel")?.scrollIntoView({behavior:"smooth",block:"nearest"});}}>{atlasCodename(id)}</button></span>):<span className="atlas-empty-position">待确认</span>}</td></tr>
 {expanded && <tr className="atlas-description-row"><td colSpan={2}>{office.description}<small>职责文案尚待确认</small></td></tr>}
 </>;
}
