import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {after,test} from "node:test";
import {currentArchiveModule,renderArchive,findElement} from "./helpers/archive-render.mjs";
import {ARCHIVE_BOOK_CHAPTERS} from "../features/archives/catalogue.ts";
import {archiveMarkdownToHtml} from "../features/archives/markdown.ts";
import {loadArchiveChapter} from "../features/archives/chapter-source.ts";
const module=await currentArchiveModule(),baseline=JSON.parse(await readFile(new URL("./fixtures/archives-before.json",import.meta.url),"utf8"));after(()=>{delete globalThis.__archiveRender});
test("archive exactly matches pre-refactor HTML in six original states",()=>{for(const entry of baseline.cases)assert.equal(renderArchive(module,entry.state).html,entry.html,entry.name)});
test("book controls preserve open/close, navigation and endpoint boundaries",()=>{
 const closed=renderArchive(module,[false,0,"",false,""]);findElement(closed.tree,e=>e.props["aria-label"]==="打开《如何从零建立一个国家》").props.onClick();assert.equal(closed.state[0],true);assert.equal(closed.state[3],true);
 const first=renderArchive(module,[true,0,"",false,""]);assert.equal(findElement(first.tree,e=>e.type==="button"&&e.props.children==="← 上一章").props.disabled,true);findElement(first.tree,e=>e.type==="button"&&e.props.children==="下一章 →").props.onClick();assert.equal(first.state[1],1);
 const last=renderArchive(module,[true,2,"",false,""]);assert.equal(findElement(last.tree,e=>e.type==="button"&&e.props.children==="下一章 →").props.disabled,true);findElement(last.tree,e=>e.type==="button"&&e.props.children==="合上书 ×").props.onClick();assert.equal(last.state[0],false);
});
test("chapter loading stays lazy and ignores late responses after closing",async()=>{
 const old=globalThis.fetch;let calls=0,resolve;globalThis.fetch=async()=>{calls++;return new Promise(r=>{resolve=r})};
 try{const closed=renderArchive(module,[false,0,"",false,""]);closed.effects[0]();assert.equal(calls,0);const open=renderArchive(module,[true,0,"previous",true,""]),cleanup=open.effects[0]();assert.equal(calls,1);cleanup();resolve(new Response("late text"));await new Promise(setImmediate);assert.equal(open.state[2],"previous")}finally{globalThis.fetch=old}
});
test("chapter URLs, source errors and Markdown escaping remain unchanged",async()=>{
 const urls=[];for(const chapter of ARCHIVE_BOOK_CHAPTERS){assert.match(chapter.source,/^\/archives\//);assert.ok((await readFile(new URL(`../public${chapter.source}`,import.meta.url),"utf8")).length>100);assert.equal(await loadArchiveChapter(chapter.source,async url=>{urls.push(url);return new Response("正文")}),"正文")}
 assert.deepEqual(urls,ARCHIVE_BOOK_CHAPTERS.map(c=>c.source));await assert.rejects(loadArchiveChapter(urls[0],async()=>new Response("",{status:404})),/这一章暂时无法打开/);
 const html=archiveMarkdownToHtml('# Heading\r\n\r\n> Quote\n\n- **bold**\n\n1. `code`\n\n<script>alert(1)</script> &');assert.match(html,/<h2>Heading<\/h2>/);assert.match(html,/<blockquote>Quote<\/blockquote>/);assert.match(html,/<ul><li><strong>bold<\/strong>/);assert.match(html,/<ol><li><code>code<\/code>/);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&amp;/);
});
