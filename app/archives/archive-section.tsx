"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { archiveMarkdownToHtml } from "./archive-markdown";
import { PageHead } from "../shell/page-head";
import chapterMetadata from "../library/archive-chapters.json";
import {loadRuntimeCapabilities} from "../library/runtime-capabilities";
import {fetchPublishedArchive,type PublishedArchive} from "../library/published-archive";

/** Book art, author emblem, copy and reading interactions are unchanged.
 * The original author emblem is provided by the hosting identity layer.
 */
type ArchiveChapter = { id: string; lesson: string; title: string; source: string; version: string; note: string; markdown?: string };

const ARCHIVE_BOOK_CHAPTERS: ArchiveChapter[] = chapterMetadata;

export function ArchivesSection({ authorMark, readerAuthorMark, authorMarkColor }: { authorMark: ReactNode; readerAuthorMark: ReactNode; authorMarkColor: string }) {
  const [bookOpen, setBookOpen] = useState(false);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [chapterText, setChapterText] = useState("");
  const [loadedSource, setLoadedSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState("");
  const [published,setPublished]=useState<PublishedArchive|null>(null);
  const [catalogError,setCatalogError]=useState("");
  const [retry,setRetry]=useState(0);
  const [dynamic,setDynamic]=useState<boolean|null>(null);
  useEffect(()=>{const controller=new AbortController();setCatalogError("");setDynamic(null);setPublished(null);setBookOpen(false);setChapterIndex(0);
   loadRuntimeCapabilities(controller.signal).then(async caps=>{if(controller.signal.aborted)return;if(caps.dynamicLibrary){const x=await fetchPublishedArchive(controller.signal);if(!controller.signal.aborted){setPublished(x);setDynamic(true)}}else setDynamic(false)}).catch(e=>{if(!controller.signal.aborted)setCatalogError(String(e));});return()=>controller.abort();},[retry]);
  const chapters:ArchiveChapter[]=dynamic?(published?.chapters??[]):ARCHIVE_BOOK_CHAPTERS;
  const chapter=chapters[chapterIndex];
  const title=published?.title??"如何从零建立一个国家";
  const records = [["R–001","第一帝国复辟公投记录","RATIFIED · 15 AUG 2026"],["A–001","宪法草案 1.0","FOUNDING DOCUMENT"],["A–002","代号与职务原始记录","CITIZEN RECORD"]];

  useEffect(() => {
    if (!bookOpen || !chapter) return;
    if (dynamic) { setChapterText(chapter.markdown??""); setLoadedSource(chapter.source); setLoading(false);setArchiveStatus("");return; }
    let active = true; const controller = new AbortController();
    setLoading(true); setArchiveStatus("");
    fetch(chapter.source, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("这一章暂时无法打开。");
        const text = await response.text();
        if (active) { setChapterText(text); setLoadedSource(chapter.source); }
      })
      .catch((error: unknown) => { if (active) setArchiveStatus(error instanceof Error ? error.message : "这一章暂时无法打开。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [bookOpen, chapter?.source]);

  const selectChapter = (index: number) => { if (index !== chapterIndex || !bookOpen) { setLoading(true); setArchiveStatus(""); setChapterIndex(index); } };
  const openChapter = (index: number) => { selectChapter(index); setBookOpen(true); };
  const chapterHtml = archiveMarkdownToHtml(chapterText);

  if(dynamic===null||(dynamic&&!published))return <section role="status">{catalogError||"正在读取正式国家书…"}{catalogError&&<button onClick={()=>setRetry(x=>x+1)}>重试</button>}</section>;
  return <>
    <PageHead eyebrow="National Archives" title="国家档案馆" copy="这里保存的不只是结论，而是我们怎样一步步把一个童年共同体写成国家。" />
    <section className="archive-book-gallery">
      <div className="archive-book-stage">
        <button type="button" className={`archive-book ${bookOpen ? "opened" : ""}`} onClick={() => openChapter(chapterIndex)} aria-label={`打开《${title}》`}>
          <span className="book-page-edges" aria-hidden="true" />
          <span className="book-cover-art"><Image src="/archive-queen-cover.png" alt="童话式女王立于月光花园中的剪影书封" fill sizes="(max-width: 760px) 82vw, 430px" priority={false} unoptimized /></span>
          <span className="book-cover-wash" aria-hidden="true" />
          <span className="book-cover-mark" style={{ "--mark": authorMarkColor } as CSSProperties}>{authorMark}</span>
          <span className="book-cover-copy"><small>SCHICKSAL NATIONAL ARCHIVES</small><strong>{title==="如何从零建立一个国家"?<>如何从零<br />建立一个国家</>:title}</strong><i>{published?.author??"AvS"} 著</i></span>
          <span className="book-spine"><b>SCHICKSAL</b><i>国家档案馆</i></span>
        </button>
        <p>点击封面打开 · OPEN THE ARCHIVE BOOK</p>
      </div>
      <aside className="archive-chapter-index">
        <header><p className="eyebrow">The Living Book · 建国实录</p><h2>不是法条的附录，<br />而是国家怎样长出来。</h2><p>书中保留争论、例子、小故事、后来发现的漏洞，以及“为什么最后会这样决定”。</p></header>
        <nav aria-label={`《${title}》章节`}>
          {chapters.map((item, index) => <button type="button" key={item.id} className={chapterIndex === index && bookOpen ? "active" : ""} onClick={() => openChapter(index)}><span>0{index + 1}</span><div><small>{item.lesson}</small><strong>{item.title}</strong><p>{item.note}</p></div><i>→</i></button>)}
        </nav>
        <footer><span>AUTHOR / 记录主体</span><strong>AvS · 宇宙霸主</strong><i>2026</i></footer>
      </aside>
    </section>

    {bookOpen && <section className="archive-reader" aria-live="polite">
      <header className="reader-topbar"><div><span>《{title}》</span><i>{chapter.lesson}</i></div><button type="button" onClick={() => setBookOpen(false)}>合上书 ×</button></header>
      <div className="archive-book-spread">
        <aside className="reader-verso">
          <div className="reader-author-mark" style={{ "--mark": authorMarkColor } as CSSProperties}>{readerAuthorMark}</div>
          <small>SCHICKSAL FIRST EMPIRE<br />NATIONAL ARCHIVES</small>
          <h2>{chapter.title}</h2>
          <p>{chapter.note}</p>
          <nav>{chapters.map((item, index) => <button type="button" key={item.id} className={index === chapterIndex ? "active" : ""} onClick={() => selectChapter(index)}><span>0{index + 1}</span><strong>{item.lesson}</strong></button>)}</nav>
          <footer><span>{chapter.version}</span><i>{String(chapterIndex + 1).padStart(2, "0")} / {String(chapters.length).padStart(2, "0")}</i></footer>
        </aside>
        <article className="reader-recto" key={chapter.id}>
          {loading || (loadedSource !== chapter.source && !archiveStatus) ? <div className="reader-loading"><i /><span>正在翻到这一章…</span></div> : archiveStatus ? <div className="reader-loading error">{archiveStatus}</div> : <div className="archive-prose" dangerouslySetInnerHTML={{ __html: chapterHtml }} />}
        </article>
      </div>
      <footer className="reader-controls"><button type="button" disabled={chapterIndex === 0} onClick={() => selectChapter(Math.max(0, chapterIndex - 1))}>← 上一章</button><span>PAGE · {String(chapterIndex + 1).padStart(2, "0")}</span><button type="button" disabled={chapterIndex === chapters.length - 1} onClick={() => selectChapter(Math.min(chapters.length - 1, chapterIndex + 1))}>下一章 →</button></footer>
    </section>}

    <section className="archive-cabinet"><header><div><p className="eyebrow">Record Cabinet · 旁卷</p><h2>其他国家档案</h2></div><span>书稿以外的认证记录与原始文书</span></header><div>{records.map(([id,title,type]) => <button type="button" key={id}><span>{id}</span><div><h3>{title}</h3><p>{type}</p></div><i>→</i></button>)}</div></section>
  </>;
}
