"use client";

import { PageHead } from "../shell/page-head";

/** Existing national calendar view, unchanged during shell restructuring. */
export function CalendarPage() {
  const events = [["04·19","National Day","国庆日","竞赛 · Puzzle Hunt · Blue Ribbon · 跳蚤市场"],["08·15","Restoration Day","复辟纪念日（名称待定）","13:43 公投以 2/3 通过，第一帝国正式复辟"],["TBD","Yogurt Festival","酸奶节","因为大家喜欢喝酸奶，所以大喝特喝"],["TBD","Fire Festival","打火节","真火 · 细生日蜡烛 · 轮流许愿"]];
  return <><PageHead eyebrow="State Calendar" title="国家节日" copy="传统可以庄重，也可以忠实保留它最初荒唐而快乐的理由。" /><div className="events">{events.map(([date,en,cn,copy],index) => <article key={en}><span>0{index + 1}</span><time>{date}</time><div><small>{en}</small><h2>{cn}</h2></div><p>{copy}</p><i>↗</i></article>)}</div></>;
}
