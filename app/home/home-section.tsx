"use client";

import { HeroEmblemSculpture } from "../emblem/hero-emblem-sculpture";
import { EMBLEM_BLADES } from "../emblem/blade-spec";

/** Approved homepage content, rendered identically after extraction. */
export function HomeSection({ go }: { go: (id: "archives") => void }) {
  return (
    <div className="home-section">
      <section className="hero">
        <div><p className="eyebrow">Imperial Core · 帝国中枢</p><h1>The Empire<br /><em>Returns.</em></h1><p>2/3 选票过半。第一帝国已经正式复辟，并继续运作。</p><button className="line-button" type="button" onClick={() => go("archives")}>READ THE RESTORATION RECORD <span>→</span></button></div>
        <div className="hero-emblem"><HeroEmblemSculpture blades={EMBLEM_BLADES} /><p>EIGHT CITIZENS · ONE SHARED EMBLEM</p><strong>帝国八棱主标志</strong><small>正式名称与类别待定</small></div>
      </section>
      <section className="status-grid">
        <article className="notice"><header><span>RESTORATION DECREE · RATIFIED</span><i>2 / 3</i></header><h2>第一帝国正式复辟</h2><p>2026 年 8 月 15 日 13:43，立法委员会就第一帝国复辟举行公投。宇宙霸主与 No.2 投下支持票，2/3 过半通过；主席随即宣布帝国正式复辟。</p><footer><span>15 AUG 2026 · 13:43</span><span>REFERENDUM PASSED</span></footer></article>
        <article className="festival"><header><span>NEXT OBSERVANCE</span><i>04·19</i></header><b>19</b><h2>National Day</h2><p>国庆日 · 竞赛、Blue Ribbon 与跳蚤市场</p></article>
        <article className="pulse"><header><span>SYSTEM PULSE</span><i>LIVE</i></header>{[["8","Citizens · 公民"],["1","Active Office · 主席"],["4","State Traditions · 传统"]].map(([n,label]) => <div key={label}><b>{n}</b><span>{label}</span></div>)}</article>
      </section>

    </div>
  );
}
