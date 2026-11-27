"use client";
import {useEffect,useRef,useState} from "react";
import type {GalleryWork} from "./gallery-client";
import {originalUrl} from "./gallery-client";
type Role="thumbnail"|"preview"|"original";
type ImageState={url:string;status:"idle"|"loading"|"ready"|"missing"|"error"};
const idle:ImageState={url:"",status:"idle"};
function useArtwork(work:GalleryWork,role:Role,enabled:boolean){
  const [state,setState]=useState<ImageState>(idle);
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    setState(idle);
    if(!enabled||!work.version_id)return;
    const controller=new AbortController();
    let url="";
    setState({url:"",status:"loading"});
    void (async()=>{
      try{
        const response=await fetch("/api/gallery/asset?"+new URLSearchParams({work:work.id,version:work.version_id!,role}),{signal:controller.signal,credentials:"same-origin",cache:"no-store"});
        if(controller.signal.aborted){await response.body?.cancel();return;}
        if(!response.ok){await response.body?.cancel();if(!controller.signal.aborted)setState({url:"",status:response.status===404?"missing":"error"});return;}
        const blob=await response.blob();
        if(controller.signal.aborted)return;
        if(!["image/png","image/jpeg","image/webp"].includes(blob.type.toLowerCase()))throw Error("Unsupported image format");
        url=URL.createObjectURL(blob);
        setState({url,status:"ready"});
      }catch{if(!controller.signal.aborted)setState({url:"",status:"error"});}
    })();
    return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
  },[work.id,work.version_id,role,enabled,retry]);
  return {...state,retry:()=>setRetry(n=>n+1)};
}
function ArtworkViewer({work,onClose}:{work:GalleryWork;onClose:()=>void}){
  const dialog=useRef<HTMLDialogElement>(null);
  const [original,setOriginal]=useState(false);
  const image=useArtwork(work,original?"original":"preview",true);
  useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();return()=>{if(node?.open)node.close();};},[]);
  return <dialog ref={dialog} className="gallery-artwork-viewer" aria-label={work.title} onCancel={event=>{event.preventDefault();onClose();}}>
    <header><div><small>IMPERIAL GALLERY · {original?"原件":"欣赏"}</small><h3>{work.title}</h3></div><button autoFocus type="button" onClick={onClose} aria-label="关闭作品欣赏">关闭</button></header>
    <div className="gallery-artwork-stage" aria-busy={image.status==="loading"}>
      {image.url?<img key={image.url} src={image.url} alt={work.title}/>:<p role="status">{image.status==="loading"||image.status==="idle"?"正在读取作品…":image.status==="missing"?"此版本暂无可用预览":"暂时无法读取作品"}</p>}
    </div>
    <footer><span>{work.collection}{work.ordinal?" · V"+work.ordinal:""}</span><div>
      {image.status==="error"&&<button type="button" onClick={image.retry}>重试</button>}
      <button type="button" onClick={()=>setOriginal(value=>!value)}>{original?"返回预览":"欣赏原图"}</button>
      {work.version_id&&<a href={originalUrl(work.id,work.version_id)}>下载原稿</a>}
    </div></footer>
  </dialog>;
}
export function GalleryArtwork({work}:{work:GalleryWork}){
  const frame=useRef<HTMLButtonElement>(null);
  const [visible,setVisible]=useState(false);
  const [open,setOpen]=useState(false);
  const thumb=useArtwork(work,"thumbnail",visible);
  useEffect(()=>{
    const node=frame.current;
    if(!node||visible)return;
    if(typeof IntersectionObserver==="undefined"){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}},{rootMargin:"180px"});
    observer.observe(node);
    return()=>observer.disconnect();
  },[visible]);
  return <>
    <button ref={frame} type="button" className="gallery-artwork-tile" disabled={!work.version_id} aria-label={"欣赏 "+work.title} onClick={()=>setOpen(true)}>
      {thumb.url?<img src={thumb.url} alt={work.title} loading="lazy" decoding="async"/>:<span className="gallery-placeholder">{thumb.status==="error"?"缩略图暂不可用":thumb.status==="missing"||!work.version_id?"暂无缩略图":"正在加载…"}</span>}
      {work.version_id&&<span className="gallery-artwork-caption">欣赏作品 ↗</span>}
    </button>
    {open&&work.version_id&&<ArtworkViewer work={work} onClose={()=>{setOpen(false);frame.current?.focus();}}/>}
  </>;
}
