"use client";

import { useEffect, useState } from "react";

export function AquariumGame({ onBack }: { onBack?: () => void } = {}) {
  const [fromGameRoom, setFromGameRoom] = useState(false);
  const [manifestAttempt,setManifestAttempt] = useState(0);
  const [frameAttempt,setFrameAttempt] = useState(0);
  const [manifest,setManifest] = useState<"checking"|"ready"|"missing">("checking");
  const [frameLoaded,setFrameLoaded] = useState(false);
  const [frameFailed,setFrameFailed] = useState(false);
  useEffect(()=>{
    let active = true;
    setManifest("checking");
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),15_000);
    fetch("/games/insaniquarium/resources/manifest.json",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(r=>{if(!r.ok)throw Error("missing manifest");if(active)setManifest("ready")})
      .catch(()=>{if(active)setManifest("missing")})
      .finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);controller.abort()};
  },[manifestAttempt]);
  useEffect(()=>{setFrameLoaded(false);setFrameFailed(false)},[frameAttempt]);
  useEffect(()=>{
    if(manifest!=="ready" || frameLoaded)return;
    const timer = setTimeout(()=>setFrameFailed(true),25_000);
    return()=>clearTimeout(timer);
  },[manifest,frameLoaded,frameAttempt]);
  useEffect(() => { setFromGameRoom(new URLSearchParams(window.location.search).get("from") === "game-room"); }, []);
  return <main style={{ minHeight: "100svh", background: "#071b20" }}>
    {(onBack || fromGameRoom) && <nav style={{ padding: "10px 18px", background: "#153c40", borderBottom: "1px solid #467678" }}>{onBack ? <button type="button" onClick={onBack} style={{ color: "#f7e5c5", fontSize: 14, background: "transparent", border: 0, cursor: "pointer" }}>← 返回八音盒游戏室</button> : <a href="/?lounge=game-room" style={{ color: "#f7e5c5", fontSize: 14, textDecoration: "none" }}>← 返回八音盒游戏室</a>}</nav>}
    {manifest==="checking"&&<p role="status" style={{padding:16,color:"#f7e5c5"}}>正在验证水族箱资源…</p>}
    {manifest==="missing"&&<div role="alert" style={{padding:16,color:"#f7e5c5"}}>水族箱资源加载失败或超时。<button type="button" onClick={()=>setManifestAttempt(n=>n+1)}>重试加载</button>{onBack&&<button type="button" onClick={onBack}>返回游戏室</button>}</div>}
    {manifest==="ready"&&<iframe key={frameAttempt} src="/games/insaniquarium/index.html" title="怪怪水族馆 · Insaniquarium Deluxe"
      onLoad={()=>setFrameLoaded(true)} onError={()=>setFrameFailed(true)}
      allow="autoplay; fullscreen" allowFullScreen
      style={{ display: "block", border: 0, width: "100%", minHeight: onBack ? "calc(100svh - 44px)" : "100svh" }} />}
    {frameFailed&&<div role="alert" style={{padding:16,color:"#f7e5c5"}}>游戏框架加载超时，请尝试重新打开。<button type="button" onClick={()=>{setFrameFailed(false);setFrameAttempt(n=>n+1)}}>重新加载</button>{onBack&&<button type="button" onClick={onBack}>返回游戏室</button>}</div>}
  </main>;
}

