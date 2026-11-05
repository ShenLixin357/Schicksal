"use client";

import { useState } from "react";

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
  const source=chosen?`https://waterfire.p.wyf9.top/games/${chosen}/`:null;
  return <main style={{minHeight:"100svh",background:"#091525",color:"#f5f3e9",fontFamily:"system-ui,sans-serif",display:"flex",flexDirection:"column"}}>
    <header style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:12,padding:"10px 18px",background:"#142a3f",borderBottom:"1px solid #63869b"}}>
      <a href="/" style={{color:"#c5eaf4",textDecoration:"none",fontSize:14}}>← 返回天命</a>
      <strong style={{marginRight:"auto"}}>🔥❄️ 森林冰火人 · 天命游戏厅</strong>
      {chosen&&<button type="button" onClick={()=>setChosen(null)} style={{padding:"8px 12px",borderRadius:8,cursor:"pointer"}}>选择其他神庙</button>}
      <button type="button" onClick={()=>setShowHelp(v=>!v)} style={{padding:"8px 12px",borderRadius:8,cursor:"pointer"}}>帮助 / 打不开？</button>
    </header>
    {showHelp&&<aside style={{background:"#29445a",padding:14,lineHeight:1.6,fontSize:14}}>
      游戏内容来自第三方 wyf9，并未托管在天命。若画面空白，说明第三方站点可能无法访问或禁止 iframe 嵌入；无法通过天命强制解除。
      {source&&<p><a href={source} target="_blank" rel="noopener noreferrer" style={{color:"#fff0a9"}}>打开对应第三方游戏网页（备用）</a></p>}
      这里仅提供本地同键盘双人，远程双人联机尚未实现。
    </aside>}
    {!chosen?
      <section style={{maxWidth:980,width:"100%",margin:"auto",padding:22,boxSizing:"border-box"}}>
        <h1 style={{fontSize:"clamp(26px,4vw,46px)",textAlign:"center"}}>选择神庙 · 1–6 代</h1>
        <p style={{textAlign:"center",opacity:.8}}>点开后尝试在独立页面内加载第三方网页游戏；不会加载 Lounge 的 3D 场景。</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:28}}>
        {games.map((game,i)=><button key={game.slug} type="button" onClick={()=>setChosen(game.slug)}
          style={{minHeight:125,background:"linear-gradient(135deg,#7a342c,#245575)",border:"2px solid #bb9559",borderRadius:14,color:"white",cursor:"pointer",fontSize:21,fontWeight:700}}>
          <span style={{display:"block",fontSize:12,opacity:.75,marginBottom:8}}>TEMPLE {i+1}</span>{game.title}
        </button>)}
        </div>
      </section>
      :<section style={{flex:1,display:"flex",flexDirection:"column",minHeight:0}}>
        <iframe key={chosen} title="森林冰火人游戏" src={source!} allow="fullscreen; gamepad" allowFullScreen
          referrerPolicy="no-referrer" style={{display:"block",width:"100%",height:"calc(100svh - 65px)",border:0,background:"#050e16"}}/>
        <p style={{padding:"7px 15px",margin:0,textAlign:"center",fontSize:12,background:"#142a3f"}}>原游戏网站：wyf9 · 如果无法加载，点击右上角「帮助 / 打不开？」</p>
      </section>
    }
  </main>;
}
