"use client";

import type { CSSProperties } from "react";
import { AMBERINA_OFFICIAL_COLOR } from "../citizens";
import { PUBLIC_MEMBER_VISUALS } from "../identity/visual-registry";
import { PageHead } from "../shell/page-head";

/** Existing points and market bodies extracted without changing their content. */
export function HonorsPage() {
  const rows = [["宇宙霸主","Amberina von Schicksal","128",AMBERINA_OFFICIAL_COLOR],["怪盗 基德","Citizen 04","114",PUBLIC_MEMBER_VISUALS.kaito.representativeColor],["我说 真的","Citizen 03","98",PUBLIC_MEMBER_VISUALS.truth.representativeColor],["哈利 波特","Citizen 05","82",PUBLIC_MEMBER_VISUALS.harry.representativeColor]];
  return <><PageHead eyebrow="Honors & Scoreboard" title="荣誉与积分" copy="每一次得分都有原因，每一次荣耀都有可审计的来处。" /><div className="honors"><div className="leaderboard">{rows.map(([code,name,points,color],index) => <article key={code} style={{ "--citizen": color } as CSSProperties}><span>0{index + 1}</span><i /><div><h2>{code}</h2><p>{name}</p></div><b>{points}<small>PTS</small></b></article>)}</div><article className="ribbon"><p>IMPERIAL DISTINCTION</p><h2>BLUE<br />RIBBON</h2><div>S</div><small>年度最高荣誉 · 可作为实体在跳蚤市场流通</small></article></div><p className="note">积分为视觉 Demo 数据；正式规则与 Blue Ribbon 权利尚待确认。</p></>;
}

export function MarketPage() {
  const goods = [["01","National Day Coin","第一帝国国庆纪念币","交换条件 · 一杯酸奶"],["02","Blue Ribbon","2026 年度实物绶带","仅转移实物所有权"],["03","Archive Print","《宪法草案 1.0》复刻件","12 Imperial Points"]];
  return <><PageHead eyebrow="Grand Flea Market" title="天命大跳蚤市场" copy="实物可以换主人，但荣誉的历史归属不会被出售。" /><div className="market">{goods.map(([n,en,cn,price]) => <article key={n}><div className="object"><span>{n}</span><i>S</i></div><small>{en}</small><h2>{cn}</h2><footer><span>{price}</span><button type="button">查看物品 →</button></footer></article>)}</div><p className="note">货币与交换规则仍处于 TODO；当前条目仅展示未来的信息层级。</p></>;
}
