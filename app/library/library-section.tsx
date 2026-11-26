"use client";
import {useEffect,useRef,useState} from "react";
type Mount = (host:HTMLElement, options?:{debug?:boolean;onError?:(error:unknown)=>void})=>()=>void;
/** Keep the approved native drawing engine in a shadow-root; the authenticated host owns the lifecycle. */
export function LibrarySection({technology=false}:{technology?:boolean}){
  const host=useRef<HTMLDivElement>(null);
  const [error,setError]=useState(false);
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
      dispose?.();debug=allowed;dispose=engine.mountLibrary(host.current,{debug,onError:()=>{if(!controller.signal.aborted)setError(true);}});mounted=true;
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
    setError(false);void boot().catch(()=>{if(!controller.signal.aborted)setError(true);});
    return()=>{controller.abort();if(interval!==undefined)clearInterval(interval);dispose?.();};
  },[technology,attempt]);
  return <section aria-label="天命图书馆">{error&&<div role="alert">图书馆暂时无法打开。 <button onClick={()=>setAttempt(n=>n+1)}>重试</button></div>}<div ref={host}/></section>;
}
