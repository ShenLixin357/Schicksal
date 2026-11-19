"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { CITIZENS, type Citizen } from "../citizens";
import {
  atlasCitizenColor, atlasCitizenName, CITIZEN_APPEARANCE,
  IMPERIAL_OFFICES, officeHolderCodename, officesOf,
  SCHICKSAL_COMMITTEE_IDS, YOUTH_COUNCIL_IDS,
} from "./atlas-data";
import "./atlas.css";

type Props = {
  renderMark: (citizen: Citizen) => ReactNode;
  renderEmblem: () => ReactNode;
  onVisitCitizen: (id: string) => void;
  onOpenHandbook: () => void;
};

export function SchicksalAtlas({ renderMark, renderEmblem, onVisitCitizen, onOpenHandbook }: Props) {
  const [selectedId, setSelectedId] = useState("amberina");
  const [hoverId, setHoverId] = useState("");
  const [expandedOfficeId, setExpandedOfficeId] = useState<string | null>(null);
  const selected = CITIZENS.find(c => c.id === selectedId) ?? CITIZENS[0];
  const highlightedId = hoverId || selectedId;
  const appearance = CITIZEN_APPEARANCE[selected.id];
  const selectedOffices = officesOf(selected.id);
  return <div className="schicksal-atlas" aria-label="天命图谱">
    <header className="atlas-heading">
      <div className="atlas-heading-icon" aria-hidden="true">✧</div>
      <div><span className="atlas-kicker">THE FIRST SCHICKSAL EMPIRE</span><h1>天命图谱 <em>Schicksal Atlas</em></h1><p>八位公民 · 同一共同体</p></div>
    </header>

    <div className="atlas-upper">
      <section className="atlas-orbital-scene" aria-label="八位公民星图">
        <div className="atlas-window-pattern" aria-hidden="true" />
        <div className="atlas-astral-ring">
          <span className="atlas-ring ring-outer" aria-hidden="true" />
          <span className="atlas-ring ring-middle" aria-hidden="true" />
          <span className="atlas-ring ring-inner" aria-hidden="true" />
          {CITIZENS.map((citizen,index) => <div key={citizen.id}
            className={"atlas-spoke" + (citizen.id===highlightedId?" active":"")}
            style={{"--node-index":index,"--node-color":atlasCitizenColor(citizen)} as CSSProperties} aria-hidden="true" />)}
          <div className="atlas-emblem-mount">{renderEmblem()}</div>
          {CITIZENS.map((citizen,index) => <button key={citizen.id}
            type="button" className={"atlas-citizen-node" + (citizen.id===highlightedId?" active":"")}
            style={{"--node-index":index,"--node-color":atlasCitizenColor(citizen)} as CSSProperties}
            aria-label={"查看 "+citizen.codename+" 的公民档案"}
            aria-pressed={selected.id===citizen.id}
            onMouseEnter={()=>setHoverId(citizen.id)} onMouseLeave={()=>setHoverId("")}
            onFocus={()=>setHoverId(citizen.id)} onBlur={()=>setHoverId("")}
            onClick={()=>setSelectedId(citizen.id)}>
            <span className="atlas-node-face">{renderMark(citizen)}</span>
            <span className="atlas-node-label">{citizen.codename}</span>
          </button>)}
          <div className="atlas-center-hit-ring" aria-label="点击主标志的对应棱位查看公民">
            {CITIZENS.map((citizen,index)=><button type="button" key={citizen.id} className="atlas-blade-hit"
              style={{"--node-index":index} as CSSProperties} aria-label={"查看主标志对应公民 "+citizen.codename}
              onMouseEnter={()=>setHoverId(citizen.id)} onMouseLeave={()=>setHoverId("")}
              onFocus={()=>setHoverId(citizen.id)} onBlur={()=>setHoverId("")}
              onClick={()=>setSelectedId(citizen.id)} />)}
          </div>
        </div>
        <div className="atlas-scene-caption">SHARED EMBLEM · EIGHT CITIZENS <span>✧</span> INTERACTIVE ATLAS</div>
      </section>

      <section className="atlas-record" style={{"--person-color":atlasCitizenColor(selected)} as CSSProperties} aria-label="公民档案">
        <header className="atlas-panel-heading"><span aria-hidden="true">✧</span><h2>公民档案</h2><small>CITIZEN RECORD</small></header>
        <div className="atlas-record-person">
          <div className="atlas-record-sigil">{renderMark(selected)}</div>
          <div className="atlas-record-identity">
            <h3>{atlasCitizenName(selected)}</h3>
            <p>公民代号 <strong>{selected.codename}</strong></p>
            <p>身份 <strong>第一帝国公民</strong></p>
            {selected.id === "amberina" && <span className="atlas-president-badge">♛ 现任主席</span>}
          </div>
        </div>
        <div className="atlas-record-offices">
          <h4>现任职务 <small>CURRENT OFFICES</small></h4>
          <div>{selectedOffices.length ? selectedOffices.map(office=><span key={office.id}>{office.title}</span>) : <p>暂无登记公职</p>}</div>
        </div>
        <div className="atlas-record-bottom">
          <button type="button" className="atlas-visit-button" onClick={()=>onVisitCitizen(selected.id)} disabled={Boolean(selected.locked)}>
            {selected.locked ? "身份档案待开放" : "↗ 访问个人主页"}
          </button>
        </div>
        {appearance?.ornamentSrc && <img className="atlas-record-flower" src={appearance.ornamentSrc} alt="" aria-hidden="true" onError={e=>{e.currentTarget.style.display="none";}} />}
      </section>
    </div>

    <div className="atlas-lower">
      <section className="atlas-organisation atlas-lower-panel">
        <header className="atlas-panel-heading"><span aria-hidden="true">♧</span><h2>国家组织</h2><small>IMPERIAL ORGANISATIONS</small></header>
        <div className="atlas-org-line"><span className="atlas-org-crest">✧</span><div><h3>天命委员会</h3><small>Schicksal Committee · 3 人</small></div><p>{SCHICKSAL_COMMITTEE_IDS.map(officeHolderCodename).join(" · ")}</p></div>
        <div className="atlas-org-line"><span className="atlas-org-crest">✦</span><div><h3>少年自治会</h3><small>Junior Self-Government Council · 5 人</small></div><p>{YOUTH_COUNCIL_IDS.map(officeHolderCodename).join(" · ")}</p></div>
      </section>
      <section className="atlas-offices atlas-lower-panel">
        <header className="atlas-panel-heading"><span aria-hidden="true">♜</span><h2>帝国公职表</h2><small>OFFICE DIRECTORY</small>
          <button className="atlas-handbook-link" type="button" title="前往图书馆政务手册" onClick={onOpenHandbook}>♧ 政务手册 ↗</button>
        </header>
        <table><thead><tr><th>职务</th><th>现任人员 · 代号</th></tr></thead><tbody>
          {IMPERIAL_OFFICES.map(office => <tr key={office.id} className={expandedOfficeId===office.id?"open":""}>
            <td colSpan={2}>
              <div className="atlas-office-row">
                <button type="button" aria-expanded={expandedOfficeId===office.id}
                  onClick={()=>setExpandedOfficeId(expandedOfficeId===office.id?null:office.id)}>
                  <span className="atlas-chevron">{expandedOfficeId===office.id?"⌄":"›"}</span>{office.title}
                </button>
                <div className="atlas-office-holders">{office.holderIds.length ? office.holderIds.map((id,i)=><span key={id}>{i>0?" · ":""}<button type="button" onClick={()=>{setSelectedId(id);document.querySelector(".atlas-record")?.scrollIntoView({behavior:"smooth",block:"nearest"});}}>{officeHolderCodename(id)}</button></span>) : <span className="atlas-no-holder">待确认</span>}</div>
              </div>
              {expandedOfficeId===office.id && <p className="atlas-office-description">{office.description}<small>职责介绍为待审核文案</small></p>}
            </td>
          </tr>)}
        </tbody></table>
      </section>
    </div>
  </div>;
}
