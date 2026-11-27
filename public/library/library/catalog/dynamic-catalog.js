import {prepareBook,searchBook} from './selection.js';
import {BookBindings,BOOK_IDS,AnimationProfiles} from './documents.js';
export function validatePublished(data){
 if(!data||!Array.isArray(data.books)||!Array.isArray(data.animations))throw Error('正式馆藏不完整');
 const unique=(rows)=>new Set(rows.map(x=>x?.id)).size===rows.length;
 if(!unique(data.books)||!unique(data.animations)||data.animations.length!==BOOK_IDS.length||!BOOK_IDS.every(id=>data.books.some(b=>b.id===id)&&data.animations.some(a=>a.id===id)))throw Error('正式馆藏绑定不完整');
 for(const b of data.books){if(typeof b.id!=='string'||typeof b.title!=='string'||typeof b.revision!=='string'||!Array.isArray(b.chapters))throw Error('无效馆藏');for(const c of b.chapters){if(typeof c.id!=='string'||typeof c.title!=='string'||typeof c.markdown!=='string'||!Array.isArray(c.blocks)||c.blocks.some(x=>typeof x.id!=='string'||typeof x.html!=='string'))throw Error('无效章节');}}
 for(const a of data.animations){const defaults=AnimationProfiles[a.id]?.parameters;if(!defaults||typeof a.revision!=='string'||!a.parameters||Object.keys(a.parameters).length!==Object.keys(defaults).length||Object.keys(defaults).some(k=>typeof a.parameters[k]!=='number'||!Number.isFinite(a.parameters[k])))throw Error('无效动画配置');}
 const avs=data.books.find(b=>b.id==='AVS');if(avs.status!=='bound'||avs.chapters.length===0||new Set(avs.chapters.map(c=>c.id)).size!==avs.chapters.length||(avs.archiveStructure!=='dynamic-v1'&&!['lesson-1','lesson-2-a','lesson-2-b','lesson-3','lesson-4','lesson-5','lesson-6'].every(id=>avs.chapters.some(c=>c.id===id))))throw Error('七份课稿不完整');
 return data;
}
export async function loadPublishedCatalog(signal){const r=await fetch('/api/library/catalog',{signal,cache:'no-store',credentials:'same-origin'});if(!r.ok)throw Error(`馆藏读取失败 (${r.status})`);const data=validatePublished(await r.json());return {documents:data.books.map(prepareBook),animations:Object.fromEntries(data.animations.map(a=>[a.id,a])),bindings:BookBindings};}
export function searchPublished(catalog,query){return catalog.documents.flatMap(book=>searchBook(book,query).map(result=>({...result,title:book.title,bookId:book.id,physical:catalog.bindings.some(b=>b.bookId===book.id)})));}
export function readPublishedChapter(catalog,bookId,chapterId){return catalog.documents.find(b=>b.id===bookId)?.chapters.find(c=>c.id===chapterId)??null;}
export function bookPresentation(book){return BookBindings.some(b=>b.bookId===book.id)?(book.status==='placeholder'?'实体书 · 内容占位符':'实体书'):'目录藏书 · 直接阅读';}
export async function saveAnimationDraft(profile,parameters,signal){if(!profile?.revision)throw Error('缺少正式基线');const r=await fetch('/api/library/manage',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'draft',kind:'animation',id:profile.id,base:profile.revision,payload:{parameters}})});const data=await r.json();if(!r.ok)throw Error(data.error??`保存失败 (${r.status})`);return data.revision;}
