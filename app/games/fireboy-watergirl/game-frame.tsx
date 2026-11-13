"use client";

import { useEffect, useState } from "react";

const games = [
  {slug:"1-forest-temple",title:"森林神庙"},
  {slug:"2-light-temple",title:"光明神庙"},
  {slug:"3-ice-temple",title:"寒冰圣殿"},
  {slug:"4-crystal-temple",title:"水晶殿"},
  {slug:"5-elements",title:"元素"},
  {slug:"6-fairy-tales",title:"童话"},
] as const;

export function FireboyWatergirlFrame() {
  const [chosen,setChosen]=useState<string|null>(null);
  const [showHelp,setShowHelp]=useState(false);
  const [fromGameRoom,setFromGameRoom]=useState(false);
  useEffect(()=>{setFromGameRoom(new URLSearchParams(window.location.search).get("from")==="game-room")},[]);
  const [installed,setInstalled]=useState<"checking"|"ready"|"missing">("checking");
  useEffect(()=>{let active=true;fetch("/games/ice-fire-import.json",{credentials:"same-origin",cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("not installed");const j=await r.json() as {imported?:string[]};if(j.imported?.length!==6)throw Error("incomplete");if(active)setInstalled("ready");}).catch(()=>{if(active)setInstalled("missing")});return()=>{active=false}},[]);
  const source=chosen?`/games/${chosen}/index.html`:null;
  return <main style={{minHeight:"100svh",background:"#091525",color:"#f5f3e9",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
    <header style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12,padding:"10px 18px",background:"#142a3f",borderBottom:"1px solid #63869b"}}>
      <a href={fromGameRoom?"/?lounge=game-room":"/"} style={{color:"#c5eaf4",textDecoration:"none",fontSize:14}}>← {fromGameRoom?"返回游戏室":"返回天命"}</a>
      <strong style={{marginRight:"auto"}}>🔥❄️ 森林冰火人 · 天命游戏厅</strong>
      {chosen&&<button type="button" onClick={()=>setChosen(null)} style={{padding:"8px 12px",borderRadius:8,cursor:"pointer"}}>选择其他神庙</button>}
      <button type="button" onClick={()=>setShowHelp(v=>!v)} style={{padding:"8px 12px",borderRadius:8,cursor:"pointer"}}>帮助 / 打不开？</button>
    </header>
    {showHelp&&<aside style={{background:"#29445a",padding:14,lineHeight:1.6,fontSize:14}}>
      游戏资源由天命同站托管，完全不需要访问 wyf9 域名。若画面空白，请确认执行了 npm run build:with-ice-fire 并且导入成功。
      {source&&<p><a href={source} target="_blank" rel="noopener noreferrer" style={{color:"#fff0a9"}}>在新标签页打开本地游戏资源</a></p>}
      这里仅提供本地同键盘双人，远程双人联机尚未实现。
    </aside>}
    {!chosen?
      <section style={{maxWidth:980,width:"100%",margin:"auto",padding:22,boxSizing:"border-box"}}>
        <h1 style={{fontSize:"clamp(26px,4vw,46px)",textAlign:"center"}}>选择神庙 · 1–6 代</h1>
        <p style={{textAlign:"center",opacity:.8}}>点击后加载天命服务器上的独立游戏文件，不加载 Lounge 的 3D 场景。</p>
        {installed==="checking"&&<p role="status">正在检查游戏资源...</p>}
        {installed==="missing"&&<p role="alert" style={{padding:18,borderRadius:10,background:"#713b32"}}>游戏资源尚未导入。部署时需要将构建命令改成 npm run build:with-ice-fire；不要使用原来仅依赖外部网址的版本。</p>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:28}}>
        {games.map((game,i)=><button key={game.slug} type="button" disabled={installed!=="ready"} onClick={()=>setChosen(game.slug)}
          style={{minHeight:125,background:"linear-gradient(135deg,#7a342c,#245575)",border:"2px solid #bb9559",borderRadius:14,color:"white",cursor:installed==="ready"?"pointer":"not-allowed",opacity:installed==="ready"?1:.5,fontSize:21,fontWeight:700}}>
          <span style={{display:"block",fontSize:12,opacity:.75,marginBottom:8}}>TEMPLE {i+1}</span>{game.title}
        </button>)}
        </div>
      </section>
      :<section style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        <iframe key={chosen} title="森林冰火人游戏" src={source!} allow="fullscreen; gamepad" allowFullScreen
          referrerPolicy="no-referrer" style={{display:"block",width:"100%",height:"calc(100svh - 65px)",border:0,background:"#050e16"}}/>
        <p style={{padding:"7px 15px",margin:0,textAlign:"center",fontSize:12,background:"#142a3f"}}>独立同站游戏资源 · 若无法加载，请检查游戏导入与静态资源路径</p>
      </section>
    }
  </main>;
}

