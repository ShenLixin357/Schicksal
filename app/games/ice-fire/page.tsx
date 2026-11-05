"use client";

import { useEffect, useRef, useState } from "react";

const W = 960, H = 540, FLOOR = 486;
type Player = { x:number; y:number; vx:number; vy:number; element:"fire"|"water"; grounded:boolean };
const initial = ():Player[] => [
  {x:64,y:438,vx:0,vy:0,element:"fire",grounded:false},
  {x:120,y:438,vx:0,vy:0,element:"water",grounded:false},
];
const platforms = [
  {x:0,y:FLOOR,w:960,h:54},
  {x:195,y:402,w:132,h:18},
  {x:376,y:335,w:136,h:18},
  {x:555,y:397,w:145,h:18},
  {x:735,y:327,w:130,h:18},
];
const pools = [
  {x:210,w:104,type:"fire"},
  {x:355,w:104,type:"water"},
  {x:526,w:88,type:"poison"},
];
const crystals = [
  {x:244,y:369,type:"fire"}, {x:428,y:302,type:"water"},
  {x:601,y:363,type:"fire"}, {x:798,y:293,type:"water"},
];
const platePositions = [664,714];

function intersects(a: {x:number;y:number;w:number;h:number}, b:{x:number;y:number;w:number;h:number}) {
  return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y;
}

export default function IceFireStandalone() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [status,setStatus] = useState("用 A/D/W 控制火，方向键控制水。双人一起踩机关！");
  const [round,setRound] = useState(0);
  useEffect(()=>{
    const c=canvas.current;if(!c)return;
    const ctx=c.getContext("2d");if(!ctx)return;
    const keys=new Set<string>();
    const players=initial(), gems=new Set<number>();
    let hold=0,unlocked=false,ended=false,frame=0,raf=0;
    const down=(e:KeyboardEvent)=>{
      const k=e.key.toLowerCase();
      if(["arrowleft","arrowright","arrowup"," ","a","d","w","r"].includes(k))e.preventDefault();
      keys.add(k);
      if(k==="r")setRound(v=>v+1);
    };
    const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
    window.addEventListener("keydown",down);window.addEventListener("keyup",up);
    const rect=(x:number,y:number,w:number,h:number,color:string)=>{
      ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
    };
    function loop(){
      if(!ctx)return;
      frame++;
      if(!ended){
        players.forEach(p=>{
          const left=p.element==="fire"?"a":"arrowleft",right=p.element==="fire"?"d":"arrowright",jump=p.element==="fire"?"w":"arrowup";
          p.vx=(Number(keys.has(right))-Number(keys.has(left)))*3.6;
          if(keys.has(jump)&&p.grounded){p.vy=-11.5;p.grounded=false;}
          const oldBottom=p.y+38;
          p.x=Math.max(0,Math.min(W-28,p.x+p.vx));
          p.vy=Math.min(12,p.vy+.49);p.y+=p.vy;p.grounded=false;
          for(const q of platforms){
            if(p.vy>=0&&oldBottom<=q.y+5&&intersects({x:p.x,y:p.y,w:28,h:38},q)){
              p.y=q.y-38;p.vy=0;p.grounded=true;
            }
          }
          if(p.y>H){ended=true;setStatus("角色掉出地图了，按 R 重开");}
          for(const pool of pools){
            if(intersects({x:p.x,y:p.y+33,w:28,h:5},{x:pool.x,y:FLOOR-8,w:pool.w,h:8}) &&
              (pool.type==="poison"||pool.type!==p.element)){
              ended=true;setStatus("碰到错误元素了，按 R 重开");
            }
          }
        });
        crystals.forEach((g,i)=>{
          const p=players.find(p=>p.element===g.type);
          if(p&&Math.hypot(p.x+14-g.x,p.y+17-g.y)<24)gems.add(i);
        });
        const onPlate=players.map((p,i)=>Math.abs((p.x+14)-(platePositions[i]+15))<19&&p.grounded&&p.y+38>=FLOOR-1);
        hold=onPlate.every(Boolean)?Math.min(60,hold+1):Math.max(0,hold-2);
        if(hold===60&&!unlocked){unlocked=true;setStatus("合作机关已开启！收齐四色水晶后两人进入右侧出口。");}
        if(unlocked&&gems.size===4&&players.every(p=>p.x>900&&p.y+38>=FLOOR-2)){
          ended=true;setStatus("✨ 双人通关成功！按 R 再玩一次");
        }
      }
      ctx.clearRect(0,0,W,H);
      const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#152848");bg.addColorStop(1,"#385f70");
      ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      for(let i=0;i<55;i++){rect((i*173+37)%W,(i*79+21)%340,2,2,"#cbe7e5a8");}
      ctx.fillStyle="#203d52";ctx.beginPath();ctx.moveTo(0,420);ctx.lineTo(230,210);ctx.lineTo(425,410);ctx.lineTo(660,170);ctx.lineTo(960,440);ctx.fill();
      platforms.forEach(p=>{rect(p.x,p.y,p.w,p.h,"#c5d4d9");rect(p.x,p.y,p.w,5,"#fff4d5");});
      pools.forEach(p=>rect(p.x,FLOOR-8,p.w,8,p.type==="fire"?"#f5794f":p.type==="water"?"#4db6f0":"#8ec24e"));
      platePositions.forEach((x,i)=>rect(x,FLOOR-8,30,8,i?"#6acbf9":"#fa956d"));
      if(!unlocked)rect(869,375,15,111,"#cda5d7");
      rect(914,394,38,92,unlocked?"#c8f3ca":"#738ca8");
      crystals.forEach((g,i)=>{
        if(gems.has(i))return;
        ctx.fillStyle=g.type==="fire"?"#ffa46c":"#85e8fa";
        ctx.beginPath();ctx.moveTo(g.x,g.y-13);ctx.lineTo(g.x+10,g.y);ctx.lineTo(g.x,g.y+13);ctx.lineTo(g.x-10,g.y);ctx.fill();
      });
      players.forEach(p=>{
        rect(p.x,p.y,28,38,p.element==="fire"?"#ef7755":"#61c3f1");
        ctx.fillStyle="#fff";ctx.fillRect(p.x+6,p.y+10,5,6);ctx.fillRect(p.x+18,p.y+10,5,6);
      });
      ctx.font="bold 21px system-ui";ctx.fillStyle="#fff";ctx.fillText("SCHICKSAL · 冰焰双生神殿",24,37);
      ctx.font="15px system-ui";ctx.fillText("水晶 "+gems.size+"/4   双人机关 "+Math.round(hold/60*100)+"%   "+(unlocked?"已解锁":"未解锁"),24,65);
      raf=requestAnimationFrame(loop);
    }
    raf=requestAnimationFrame(loop);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);};
  },[round]);
  return <main style={{margin:0,minHeight:"100svh",padding:"22px 12px",background:"#0c1a2f",color:"#f9f1e4",fontFamily:"system-ui,sans-serif",display:"grid",placeItems:"center"}}>
    <section style={{width:"min(1080px,100%)",textAlign:"center"}}>
      <p style={{letterSpacing:".22em",fontSize:12,color:"#a2cbd6"}}>SCHICKSAL · STANDALONE GAME PROTOTYPE</p>
      <h1 style={{fontSize:"clamp(24px,4vw,42px)",margin:"8px 0 20px"}}>🔥 冰焰双生神殿 ❄️</h1>
      <canvas ref={canvas} width={W} height={H} aria-label="双人平台解谜游戏" style={{display:"block",width:"100%",height:"auto",background:"#193653",border:"2px solid #7896a9",borderRadius:16}}/>
      <p role="status" style={{minHeight:26}}>{status}</p>
      <p style={{fontSize:14,color:"#c3d4df"}}>火：A D 移动 / W 跳跃　 ·　 水：← → 移动 / ↑ 跳跃　 ·　 R 重开</p>
      <button onClick={()=>setRound(v=>v+1)} style={{background:"#f3c77e",border:0,borderRadius:8,padding:"12px 22px",fontWeight:700,cursor:"pointer"}}>重开关卡</button>
      <p style={{fontSize:12,opacity:.75}}>原创机制演示 · 独立页面 · 暂不支持远程联机 · 不影响现有天命网站</p>
    </section>
  </main>;
}
