"use client";
import { useState } from "react";
import "./atlas.css";

const CHAPTERS = [
  { title:"入门与身份", en:"CIVIC ACCESS", intro:"天命公民使用个人身份进入网站。", steps:["在主导航打开「天命图谱」，可浏览八位公民与当前组织。","点击公民的个人标识，展开公民档案；通过「访问个人主页」查看已开放的资料。","只能修改自己的资料；其他公民的私人信息和账户设置不开放。"] },
  { title:"提案与议会", en:"PROPOSALS", intro:"在议会中处理公开议案，保留讨论与程序记录。", steps:["前往「议会」查看议案与各自阶段。","草案和正式提案的处理方式不同，提交前应核对文本。","讨论、修正与投票以系统当前公布的正式程序为准。"] },
  { title:"公职查询", en:"OFFICE DIRECTORY", intro:"职位与任职者的对应关系由天命图谱统一维护。", steps:["打开「天命图谱」下方的「帝国公职表」。","点击职位名称查看拟定职责范围；点击任职者代号可定位该人档案。","未最终确认的任职者标注「待确认」，不会自动视为正式任命。"] },
  { title:"国家档案", en:"ARCHIVES", intro:"现行工作说明与历史档案属于不同资料类型。", steps:["图书馆与国家档案馆保存文献、历史记录和历任公职。","现任公职在「天命图谱」查询，历史任期以后由图书馆提供。","本手册为网站操作说明，不代替宪法、法案或正式制度文件。"] },
];

export function GovernmentHandbook({onBack}:{onBack:()=>void}) {
  const [chapter,setChapter]=useState(0);
  const current=CHAPTERS[chapter];
  return <div className="atlas-handbook-page">
    <header><p>SCHICKSAL LIBRARY · CIVIC HANDBOOK</p><button onClick={onBack} type="button">← 返回国家档案馆</button></header>
    <h1>政务手册 <em>Government Handbook</em></h1>
    <p className="atlas-handbook-intro">查阅天命网站的政务操作方式与公职查询入口。本页是操作指引，不是已生效法律文本。</p>
    <div className="atlas-handbook-layout">
      <nav aria-label="政务手册章节">{CHAPTERS.map((c,i)=><button key={c.en} className={i===chapter?"active":""} onClick={()=>setChapter(i)} type="button"><span>0{i+1}</span>{c.title}<small>{c.en}</small></button>)}</nav>
      <article><span>CHAPTER 0{chapter+1}</span><h2>{current.title}</h2><p>{current.intro}</p><ol>{current.steps.map(step=><li key={step}>{step}</li>)}</ol><small>如操作说明与正式制度冲突，以经确认并生效的制度为准。</small></article>
    </div>
  </div>;
}
