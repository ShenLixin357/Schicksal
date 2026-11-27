export const CATEGORIES=['完成作品','概念设计','设计草稿','未采用方案','艺术素材','参考资料','制作教程','工程文件'] as const;
export type Category=typeof CATEGORIES[number];
export type FileRoute='image'|'digital'|'unsupported';
export const BATCH_LIMIT=100;
const MiB=1024*1024;
export function inspectFilename(name:string,size:number){
 const ext=name.toLowerCase().endsWith('.tar.gz')?'tgz':name.split('.').at(-1)?.toLowerCase()??'';
 let route:FileRoute='unsupported',media='未支持格式',category:Category='参考资料',limit=0;
 if(['png','jpg','jpeg','webp'].includes(ext)){route='image';media='图像';category='完成作品';limit=12*MiB;}
 else if(['zip','tgz','ora','procreate'].includes(ext)){route='digital';media='工程包';category='工程文件';limit=256*MiB;}
 else if(['md','txt','pdf'].includes(ext)){route='digital';media='文档';category='参考资料';limit=256*MiB;}
 else if(['gif','mp4','webm'].includes(ext)){route='digital';media='动态作品';category='完成作品';limit=256*MiB;}
 else if(['glb','gltf','html','htm'].includes(ext)){route='digital';media='模型或交互工程';category='工程文件';limit=256*MiB;}
 const reason=!name.trim()||name.length>240||/[\\/:\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name)||name==='.'||name==='..'?'文件名不符合当前入口要求':route==='unsupported'?'当前上传接口不支持此格式':!Number.isSafeInteger(size)||size<=0?'空文件或大小无效':size>limit?'超过当前接口大小限制':'';
 return {route,media,category,limit,reason};
}
export type ImportEntry={name:string;bytes:number;sha256:string|null;category:Category;media:string;route:FileRoute;reason:string;project:string};
export function summarizeEntries(entries:ImportEntry[]){
 const seen=new Set<string>();let bytes=0,uniqueBytes=0,duplicates=0,blocked=0;
 for(const entry of entries){bytes+=entry.bytes;if(entry.reason||!entry.sha256){blocked++;continue;}if(seen.has(entry.sha256)){duplicates++;continue;}seen.add(entry.sha256);uniqueBytes+=entry.bytes;}
 return {bytes,uniqueBytes,duplicates,blocked,ready:seen.size};
}
