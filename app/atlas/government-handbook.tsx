"use client";
import { useState } from "react";
import "./atlas.css";

const chapters = [
 {title:"公民身份与公开档案",en:"CITIZENS",lines:["在「天命图谱」中选择任一公民节点，查看其公开身份、组织和当前职务。","访问他人个人页时只能查看公开内容，不能访问其账户设置、私有记录或编辑功能。"]},
 {title:"议会与政务",en:"GOVERNMENT",lines:["进入「帝国政务」处理提案、讨论和投票。","任何制度性权利、期限和程序均以已生效的宪法及法律为准，不以本手册取代。"]},
 {title:"公职与现任人员",en:"PUBLIC OFFICES",lines:["「天命图谱」公职表按职位索引，而非按人物列职位。","点击职位查阅职责草案；点击任职者代号可查看该公民档案。","空缺和未确认的任命必须明确标注，不得默认已任职。"]},
 {title:"历史与图书馆",en:"ARCHIVE",lines:["图谱只展示现任公职，历任人员、任期和交接记录以后由图书馆归档查询。","本手册为网站使用指引，未获正式确认的职责说明不构成法律。"]},
];
export function AtlasGovernmentHandbook({onBack}:{onBack:()=>void}){
 const [index,setIndex]=useState(0);const chapter=chapters[index];
 return <main className="atlas-handbook-page">
  <header><span>SCHICKSAL LIBRARY · GOVERNMENT HANDBOOK</span><button type="button" onClick={onBack}>← 返回档案馆</button></header>
  <h1>政务手册 <em>Government Handbook</em></h1><p className="atlas-handbook-foreword">图书馆 · 政务操作指南（整理稿）。正式规则以已通过并生效的制度文件为准。</p>
  <div className="atlas-handbook-layout"><nav aria-label="手册目录">{chapters.map((ch,i)=><button type="button" className={index===i?"active":""} onClick={()=>setIndex(i)} key={ch.en}><small>0{i+1}</small>{ch.title}<em>{ch.en}</em></button>)}</nav>
   <article><p>CHAPTER 0{index+1}</p><h2>{chapter.title}</h2><ol>{chapter.lines.map(line=><li key={line}>{line}</li>)}</ol></article>
  </div>
 </main>;
}