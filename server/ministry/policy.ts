/** Existing module authorizations remain the ceiling; this registry can restrict
 * a member's access, never override committee membership, ownership or office. */
export const MEMBERS = ['amberina','zxy','truth','kaito','harry','sealed-6','sealed-7','sealed-8'] as const;
export const ACTIVE = MEMBERS.slice(0,5);
export const FEATURES = [
 {id:'photos',label:'家庭影像馆',paths:['/api/photos'],state:'existing'},
 {id:'archives',label:'国家档案馆',paths:['/archives'],state:'existing'},
 {id:'library',label:'魔法图书馆',paths:['/library','/api/library'],state:'candidate'},
 {id:'gallery',label:'Gallery 艺术馆藏',paths:['/api/gallery'],state:'candidate'},
 {id:'digital',label:'数字藏品',paths:['/api/digital'],state:'candidate'},
] as const;
export type Feature = typeof FEATURES[number]['id'];
export type Policy = 'inherit'|'deny'|'read'|'use';
export type Mode = 'open'|'read-only'|'closed';
export type Kind = 'profile'|'account'|'permission'|'feature';
export type Profile = {displayName:string;englishName:string;codename:string;bio:string;title:string};
export const PROFILE_EMPTY:Profile={displayName:'',englishName:'',codename:'',bio:'',title:''};
export const defaults=(kind:Kind):Record<string,unknown>=>kind==='profile'?{...PROFILE_EMPTY}:kind==='account'?{frozen:false}:kind==='permission'?{policy:'inherit'}:{mode:'open'};
export const featureForPath=(path:string)=>FEATURES.find(f=>f.paths.some(p=>path===p||path.startsWith(p+'/')))?.id;
export function featuresForRequest(url:URL):Feature[] {
 let path=url.pathname;
 // Image optimization can proxy an otherwise protected asset.
 if(path==='/_vinext/image') {const src=url.searchParams.get('url');if(!src)return [];try{const resolved=new URL(src,url);if(resolved.origin!==url.origin)return [];path=resolved.pathname;}catch{return [];}}
 try {for(let i=0;i<3&&path.includes('%');i++){const next=decodeURIComponent(path);if(next===path)break;path=next;}}catch{/* retain normalized prefix for conservative mapping */}
 path=path.toLowerCase().replace(/\\/g,'/').replace(/\/+/g,'/').replace(/\/$/,'');
 const stack:string[]=[];for(const segment of path.split('/')){if(segment==='..')stack.pop();else if(segment&&segment!=='.')stack.push(segment);}path='/'+stack.join('/');
 if(path==='/api/library/discovery'||path==='/api/library/workspace')return ['library','gallery','digital','archives'];
 if(path==='/api/library/catalog')return ['library','archives'];
 const f=featureForPath(path);return f?[f]:[];
}
export function decide(mode:Mode,policy:Policy,method:string,minister=false):{allowed:boolean;reason:string} {
 if(minister)return {allowed:true,reason:'现任部长技术管理权限；仍须通过原模块授权'};
 if(mode==='closed')return {allowed:false,reason:'功能已暂停'};
 if(policy==='deny')return {allowed:false,reason:'成员访问已禁止'};
 if((mode==='read-only'||policy==='read')&&!['GET','HEAD','OPTIONS'].includes(method))return {allowed:false,reason:'当前仅允许读取'};
 return {allowed:true,reason:'允许进入原有授权检查；不授予额外身份权限'};
}
export function enabled(e:unknown):boolean {const x=e as {SCHICKSAL_MINISTRY_V2?:string;SCHICKSAL_PREVIEW_COMMIT?:string};return x.SCHICKSAL_MINISTRY_V2==='1'&&/^[a-f0-9]{40}$/i.test(x.SCHICKSAL_PREVIEW_COMMIT??'');}
