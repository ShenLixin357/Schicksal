export type PublishedChapter = {id:string;lesson:string;title:string;version:string;note:string;markdown:string;source:string};
export type PublishedArchive = {title:string;author:string;revision:string;chapters:PublishedChapter[]};
export function parsePublishedArchive(data:unknown):PublishedArchive {
 const books=(data as {books?:unknown})?.books;
 if(!Array.isArray(books))throw Error('馆藏数据无效');
 const book=books.find(b=>b?.id==='AVS');
 if(!book||typeof book.revision!=='string'||typeof book.title!=='string'||typeof book.author!=='string'||!Array.isArray(book.chapters)||!book.chapters.length)throw Error('国家书尚未初始化');
 const ids=new Set<string>();const chapters:PublishedChapter[]=book.chapters.map((c:Record<string,unknown>)=>{
  for(const k of ['id','lesson','title','version','note','markdown'])if(typeof c[k]!=='string')throw Error('章节字段无效');
  if(ids.has(c.id as string))throw Error('章节编号重复');ids.add(c.id as string);
  return {...c,source:`revision:${book.revision}:${c.id}`} as PublishedChapter;
 });
 if(book.archiveStructure!=='dynamic-v1'&&!['lesson-1','lesson-2-a','lesson-2-b','lesson-3','lesson-4','lesson-5','lesson-6'].every(id=>ids.has(id)))throw Error('七份课稿不完整');
 return {title:book.title,author:book.author,revision:book.revision,chapters};
}
export async function fetchPublishedArchive(signal:AbortSignal){const r=await fetch('/api/library/catalog',{credentials:'same-origin',cache:'no-store',signal});if(!r.ok)throw Error(`国家书读取失败 (${r.status})`);return parsePublishedArchive(await r.json());}
