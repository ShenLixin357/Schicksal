"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import "./personal-discovery.css";
/** User-gesture audio unlock; only server-acknowledged first discoveries play.
 * No media is fetched; no autoplay or external AI. */
export function PersonalDiscoveryToast({mark,identity}:{mark:ReactNode;identity:string}){
 const [visible,V]=useState(false),[count,C]=useState(0),[serial,S]=useState(0);
 const audio=useRef<AudioContext|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),last=useRef(0);
 useEffect(()=>{
  V(false);C(0);last.current=0;
  const unlock=()=>{try{const A=window.AudioContext||(window as unknown as {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(!A)return;if(!audio.current)audio.current=new A();if(audio.current.state==="suspended")void audio.current.resume().catch(()=>{});}catch{}};
  const sound=()=>{try{const a=audio.current;if(!a||a.state!=="running"||localStorage.getItem("schicksal:discovery-sound")==="off"||document.hidden)return;const now=a.currentTime;for(const [freq,delay,peak] of [[1318.51,0,.045],[1975.53,.055,.026],[2637.02,.105,.015]]){const o=a.createOscillator(),g=a.createGain();o.type="sine";o.frequency.value=freq;g.gain.setValueAtTime(.0001,now+delay);g.gain.exponentialRampToValueAtTime(peak,now+delay+.012);g.gain.exponentialRampToValueAtTime(.0001,now+delay+.42);o.connect(g);g.connect(a.destination);o.start(now+delay);o.stop(now+delay+.44);}}catch{}};
  const found=(event:Event)=>{if(document.hidden||(event as CustomEvent<{identity?:string}>).detail?.identity!==identity)return;const now=performance.now();if(!last.current||now-last.current>1800){sound();S(s=>s+1);}last.current=now;C(c=>c+1);V(true);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>{V(false);C(0);last.current=0},3200);};
  window.addEventListener("pointerdown",unlock,{passive:true});window.addEventListener("keydown",unlock);window.addEventListener("imperial-first-discovery",found);
  return()=>{window.removeEventListener("pointerdown",unlock);window.removeEventListener("keydown",unlock);window.removeEventListener("imperial-first-discovery",found);if(timer.current)clearTimeout(timer.current);if(audio.current){void audio.current.close().catch(()=>{});audio.current=null;}};
 },[identity]);
 return <div className="personal-discovery-host" role="status" aria-live="polite" aria-atomic="true">{visible&&<div className="personal-discovery" key={serial}><span className="personal-discovery-mark" aria-hidden="true">{mark}</span><div><small>A NEW MEMORY</small><strong>{count>1?count+" 段新记忆已收入图鉴":"新的发现"}</strong><span>探索记录已更新</span></div></div>}</div>;
}
