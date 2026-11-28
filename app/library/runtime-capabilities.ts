"use client";
import {useEffect,useState} from 'react';
export type RuntimeCapabilities={dynamicLibrary:boolean;galleryEntry:boolean;bookSubmission:boolean};
export async function loadRuntimeCapabilities(signal:AbortSignal):Promise<RuntimeCapabilities>{
 const r=await fetch('/api/site-capabilities',{credentials:'same-origin',cache:'no-store',signal});
 if(!r.ok)throw Error('功能配置暂不可用');
 const d=await r.json();
 if(typeof d.dynamicLibrary!=='boolean'||typeof d.galleryEntry!=='boolean'||typeof d.bookSubmission!=='boolean')throw Error('功能配置无效');
 return d;
}
export function usePreviewGallery(identity:string){
 const [state,S]=useState<{identity:string;enabled:boolean}|null>(null);
 useEffect(()=>{const a=new AbortController();S(null);loadRuntimeCapabilities(a.signal).then(x=>{if(!a.signal.aborted)S({identity,enabled:x.galleryEntry})}).catch(()=>{});return()=>a.abort()},[identity]);
 return state?.identity===identity&&state.enabled;
}
