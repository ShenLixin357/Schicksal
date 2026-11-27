/** Shared deterministic identity plan. No legacy upload fallback. */
export const galleryCategories=Object.freeze(["完成作品","概念设计","设计草稿","未采用方案","艺术素材","参考资料","制作教程","工程文件"]);
const id=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(x);
export function unifiedSubmission(job,metadata){
 const work=job.workId??job.requestId,version=job.versionRequestId,base=job.baseVersion;
 const title=metadata?.title??job.file.name.replace(/\.[^.]+$/u,"").slice(0,180);
 const category=metadata?.category??job.collection;
 if(!id(work)||!id(version)||base!==undefined&&(!id(base)||!job.workId)||!galleryCategories.includes(category)||typeof title!=="string"||!title.trim()||title.length>180)throw Error("作品编号、名称或分类无效；请检查原任务清单");
 if(base&&!metadata)throw Error("追加版本前须核对原作品名称与分类");
 const q=new URLSearchParams({work,version,name:job.file.name,title,category});
 if(base)q.set("base",base);
 return {work,version,query:q.toString()};
}
