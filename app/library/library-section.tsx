"use client";
import {lazy,Suspense,useEffect,useRef,useState} from "react";
import {DYNAMIC_LIBRARY_ENABLED,LIBRARY_COLLECTIONS_ENABLED,LIBRARY_SEMANTIC_SEARCH_ENABLED} from "./library-mode";
import {recordExploration} from "../guide/exploration";
import {CollectionSearch} from "./search/collection-search";
import {LibraryManagement} from "./library-management";
const LibraryCollections=lazy(()=>import("./library-collections").then(m=>({default:m.LibraryCollections})));
type Mount = (host:HTMLElement, options?:{debug?:boolean;dynamic?:boolean;semanticSearch?:boolean;onOpenCollectionSearch?:()=>void;onOpenGuide?:()=>void;initialBookSearch?:boolean;onDiscover?:(id:string)=>Promise<boolean>;onError?:(error:unknown)=>void})=>()=>void;
/** Keep the approved native drawing engine in a shadow-root; the authenticated host owns the lifecycle. */
export function LibrarySection({technology=false,onOpenGuide,initialSearch}:{technology?:boolean;onOpenGuide?:()=>void;initialSearch?:"books"|"collections"}){
  const host=useRef<HTMLDivElement>(null);
  const [error,setError]=useState(false);
  const [management,setManagement]=useState(false);
  const [authorized,setAuthorized]=useState(false);
  const [collections,setCollections]=useState(false);
  const [searchOpen,setSearchOpen]=useState(initialSearch==="collections");
  const searchPanel=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(searchOpen)searchPanel.current?.scrollIntoView({block:"start"});},[searchOpen]);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let dispose:(()=>void)|undefined;
    let mounted=false,debug=false,checking=false;let interval:ReturnType<typeof setInterval>|undefined;
    let engine:{mountLibrary:Mount}|undefined;
    async function check(){
      if(!technology)return false;
      try{
        const response=await fetch("/api/library/debug",{cache:"no-store",credentials:"same-origin",signal:controller.signal});
        if(!response.ok)return false;
        const data=await response.json();
        return data.authorized===true&&data.mode==="local-preview-only"&&data.publish===false;
      }catch{return false;}
    }
    function mount(allowed:boolean){
      if(controller.signal.aborted||!host.current||!engine)return;
      dispose?.();debug=allowed;setAuthorized(allowed);setManagement(allowed&&DYNAMIC_LIBRARY_ENABLED);dispose=engine.mountLibrary(host.current,{debug,dynamic:DYNAMIC_LIBRARY_ENABLED,semanticSearch:LIBRARY_SEMANTIC_SEARCH_ENABLED&&DYNAMIC_LIBRARY_ENABLED,onOpenCollectionSearch:()=>setSearchOpen(true),onOpenGuide,initialBookSearch:initialSearch==="books",onDiscover:recordExploration,onError:()=>{if(!controller.signal.aborted)setError(true);}});mounted=true;
    }
    async function recheck(){
      if(!mounted||!debug||checking||controller.signal.aborted)return;
      checking=true;try{if(!await check()&&!controller.signal.aborted)mount(false);}catch{if(!controller.signal.aborted)setError(true);}finally{checking=false;}
    }
    const visible=()=>{if(!document.hidden)void recheck();};
    const boot=async()=>{
      const allowed=await check();
      const url="/library/library/catalog/mount.js";
      engine=await import(/* @vite-ignore */ url) as {mountLibrary:Mount};
      mount(allowed);
      if(allowed&&!controller.signal.aborted){interval=setInterval(()=>void recheck(),30000);document.addEventListener("visibilitychange",visible,{signal:controller.signal});}
    };
    setError(false);setAuthorized(false);setManagement(false);void boot().catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>{controller.abort();if(interval!==undefined)clearInterval(interval);dispose?.();};
  },[technology,attempt]);
  return <section aria-label="天命图书馆">{error&&<div role="alert">图书馆暂时无法打开。 <button onClick={()=>setAttempt(n=>n+1)}>重试</button></div>}<div ref={host}/>{LIBRARY_SEMANTIC_SEARCH_ENABLED&&DYNAMIC_LIBRARY_ENABLED&&searchOpen&&<div ref={searchPanel}><CollectionSearch onClose={()=>setSearchOpen(false)}/></div>}{management&&technology&&<LibraryManagement onPublished={()=>setAttempt(n=>n+1)}/>} {LIBRARY_COLLECTIONS_ENABLED&&<><button aria-expanded={collections} onClick={()=>setCollections(v=>!v)}>{collections?"关闭馆藏功能预览":"打开馆藏功能预览"}</button>{collections&&<Suspense fallback={<p role="status">正在打开馆藏…</p>}><LibraryCollections minister={technology&&authorized}/></Suspense>}</>}</section>;
}
