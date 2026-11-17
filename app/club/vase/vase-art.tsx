"use client";

import { useId, type ReactNode } from "react";
import "./vase-art.css";

const ORIGINALS = new Set(["autumn", "sunflower", "roses", "tulips", "lavender", "daisies", "cabbage", "popcorn", "lollipop"]);
const STARS = [[127, 136], [182, 94], [267, 116], [338, 91], [373, 169], [328, 215], [213, 204], [156, 251]];
const FLAKES = [[153, 126], [344, 155], [195, 247], [318, 283], [268, 84], [374, 238]];
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300];

type ArtProps = { selection: string; celebrated?: boolean };

function Stem({ d, frost = false }: { d: string; frost?: boolean }) {
  return <path d={d} fill="none" stroke={frost ? "#a9dbdd" : "#7d9156"} strokeWidth={4.5} strokeLinecap="round" />;
}

function Leaf({ x, y, angle = 0, scale = 1, frost = false, id }: { x: number; y: number; angle?: number; scale?: number; frost?: boolean; id: string }) {
  return <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${scale})`}>
    <path d="M0 0C-13-31-44-49-67-47C-62-18-28 5 0 0Z" fill={`url(#${id}-${frost ? "ice" : "leaf"})`} stroke={frost ? "#d2f1f1" : "#9d9a53"} strokeWidth="1.1" />
    <path d="M-3-2Q-32-26-61-43M-26-19l-1-16M-42-31l-14 1M-15-10l-18 1" fill="none" stroke={frost ? "#e4ffff" : "#b6a66a"} strokeWidth="1" opacity=".62" />
  </g>;
}

function Spark({ x, y, size = 7, delay = 0, gold = false }: { x: number; y: number; size?: number; delay?: number; gold?: boolean }) {
  return <g className={`vase-art-spark${gold ? " vase-art-gold-spark" : ""}`} style={{ animationDelay: `${delay}s`, transformOrigin: `${x}px ${y}px` }}>
    <path d={`M${x} ${y-size}Q${x+1.5} ${y-1.5} ${x+size} ${y}Q${x+1.5} ${y+1.5} ${x} ${y+size}Q${x-1.5} ${y+1.5} ${x-size} ${y}Q${x-1.5} ${y-1.5} ${x} ${y-size}Z`} fill={gold ? "#ffdf79" : "#e7faff"} />
    <circle cx={x} cy={y} r="1.6" fill="#fffbea" />
  </g>;
}

function Vase({ id }: { id: string }) {
  return <g className="vase-art-vessel">
    <ellipse cx="260" cy="477" rx="69" ry="6" fill="#170f20" opacity=".26" />
    <path d="M221 326Q258 319 294 326L290 347C290 358 319 367 324 394C333 424 308 449 294 459L297 466H219L222 459C205 444 188 419 195 393C200 367 226 358 226 347Z" fill={`url(#${id}-vessel)`} stroke="#b58440" strokeWidth="2.8" />
    <path d="M224 344Q214 369 211 392T227 446" fill="none" stroke="#c48bd8" strokeWidth="6" opacity=".28" strokeLinecap="round" />
    <path d="M294 365C313 385 319 409 303 432" fill="none" stroke="#f8bf68" strokeWidth="3" opacity=".68" strokeLinecap="round" />
    <ellipse cx="258" cy="326" rx="39" ry="7" fill="#2d162c" stroke={`url(#${id}-gold)`} strokeWidth="4" />
    <path d="M223 332Q258 340 292 332M219 464Q259 473 298 464" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="4" />
    <path d="M220 467Q258 474 297 467L307 476Q259 484 210 476Z" fill={`url(#${id}-gold)`} stroke="#674022" strokeWidth="1.5" />
    <ellipse cx="258" cy="476" rx="47" ry="3" fill="#f5d08b" opacity=".62" />
    <path d="M270 378C244 379 236 407 253 422C264 432 279 430 287 419C268 426 253 408 259 393C261 386 265 381 270 378Z" fill={`url(#${id}-gold)`} stroke="#f8d897" strokeWidth=".8" />
    <path d="m281 391 2-6 2 6 6 2-6 2-2 6-2-6-6-2Zm-49 24 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" fill="#f4ce85" />
    <path d="M211 433q8-5 4-13m1 9 7-5m-4 12q9 4 12 13m-9-6-6-1m81-9q-9-6-5-16m-1 13-8-6m6 14q-8 5-12 12m8-7 7-1M233 343q-7 8-12 2m14-4q7 12 13 2m3-3q8 11 14 1m4-1q7 11 14 0m-38 9q13 9 27 0" fill="none" stroke="#d4a155" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M209 390Q197 418 215 438" fill="none" stroke="#785087" strokeWidth="2.2" />
  </g>;
}

function Iris({ x, y, scale = 1, id }: { x: number; y: number; scale?: number; id: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M0 7C-21-17-24-60-4-68C16-66 17-20 0 7Z" fill={`url(#${id}-iris)`} stroke="#c5b1e4" strokeWidth="1.6" />
    <path d="M-3 9C-15-17-50-47-62-29C-72-6-30 20-3 9ZM5 8C21-17 55-42 65-22C71 0 33 23 5 8Z" fill={`url(#${id}-iris)`} stroke="#b29ad5" strokeWidth="1.6" />
    <path d="M0 4C-32-1-56 13-46 36C-35 60-6 38 0 4ZM3 6C35-1 56 15 43 38C29 61 3 38 3 6Z" fill={`url(#${id}-iris-dark)`} stroke="#a391cd" strokeWidth="1.6" />
    <path d="M0 7C-9 26-11 51 4 53C19 47 16 22 0 7Z" fill={`url(#${id}-iris-dark)`} stroke="#b29ad5" strokeWidth="1.6" />
    <path d="M-5 10Q-27 16-36 30M6 10Q26 20 33 31M1 11l3 29M-6-4l-2-42M-12 3l-32-21M12 1l34-18" fill="none" stroke="#c5a7e0" strokeWidth="1.3" opacity=".65" />
    <path d="m-4 11-20 12m28-11 18 13m-20-11 3 22" fill="none" stroke="#edbe5d" strokeWidth="5" strokeLinecap="round" />
    <circle cy="6" r="6" fill="#f1d47d" />
  </g>;
}

function Irises({ id }: { id: string }) {
  return <><Stem d="M253 339Q244 223 230 145M266 337Q295 251 321 201M242 336Q204 247 166 219" />
    {[[-21, -19], [31, 9], [-3, -4]].map(([dx,dy],i)=><path key={i} d={`M${245+dx} 338Q${231+dx} ${242+dy} ${215+dx} ${210+dy}Q${259+dx} 263 ${260+dx} 336Z`} fill={`url(#${id}-leaf)`} stroke="#b7b06b" strokeWidth="1" />)}
    <Leaf x={281} y={282} angle={124} scale={.9} id={id} />
    <Iris x={165} y={210} scale={.77} id={id} /><Iris x={322} y={194} scale={.85} id={id} /><Iris x={231} y={146} scale={1.04} id={id} />
  </>;
}

function Hydrangea({ id }: { id: string }) {
  const florets = Array.from({length: 55}, (_,i) => { const a=i*2.39996, r=12*Math.sqrt(i);return [254+Math.cos(a)*r*1.1,195+Math.sin(a)*r*.85,i]; });
  return <><Stem d="M258 339Q252 270 254 216" /><Leaf x={255} y={307} angle={-6} scale={1.12} id={id} /><Leaf x={265} y={295} angle={137} scale={1.2} id={id} />
    <ellipse cx="254" cy="200" rx="97" ry="73" fill="#7275a7" />
    {florets.map(([x,y,i])=><g key={i} transform={`translate(${x} ${y}) rotate(${i*37})`}>
      {[0,72,144,216,288].map(a=><path key={a} transform={`rotate(${a})`} d="M0 0C-19-1-20-21-7-24C5-24 8-11 0 0Z" fill={i%3===0?`url(#${id}-hydrangea-pink)`:`url(#${id}-hydrangea)`} stroke="#c6c5e8" strokeWidth=".65" />)}
      <circle r="2.3" fill="#eee3a6" /><circle cx="-.6" cy="-.7" r=".8" fill="#fff8db" />
    </g>)}
  </>;
}

function Lilies({ id, frost = false }: { id: string; frost?: boolean }) {
  const bells = [[205,168,-17,.92],[191,207,-14,1],[209,247,3,.93],[290,145,19,.88],[309,187,19,1],[295,230,-5,1],[254,192,8,.76]];
  return <><Stem d="M247 341Q248 148 205 136M265 341Q271 125 295 119M255 340Q242 195 250 167" frost={frost} />
    <path d="M242 341Q159 283 170 205C214 224 242 290 242 341ZM267 341Q325 245 352 218C360 277 303 331 267 341Z" fill={`url(#${id}-${frost?"ice":"leaf"})`} stroke={frost?"#ceeff7":"#a1a365"} strokeWidth="1.5" />
    <path d="M239 331Q191 264 177 222M275 329Q317 269 346 229" fill="none" stroke={frost?"#d5faff":"#c1be80"} strokeWidth="1.4" opacity=".6" />
    {bells.map(([x,y,a,s],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M-2-17Q-26-19-28 3" fill="none" stroke={frost?"#c6f5f5":"#8d9c5e"} strokeWidth="2.3" />
      <path d="M-30 0C-47 3-49 22-51 29Q-45 25-40 31Q-35 25-29 31Q-24 25-18 29C-22 21-16 5-30 0Z" fill={`url(#${id}-${frost?"ice":"ivory"})`} stroke={frost?"#d3f9ff":"#ded6b3"} strokeWidth="1.2" />
      <path d="M-31 4Q-34 14-33 25M-29 4l9 23M-32 5l-17 22" fill="none" stroke={frost?"#fffaff":"#f7f1d5"} strokeWidth="1" opacity=".7" />
      {frost&&<><circle className="vase-art-ice-light" cx="-33" cy="22" r="4" fill="#cbf7ff" style={{animationDelay:`${i*.41}s`}} /><path className="vase-art-dew" d="M-34 34q-7 11 0 12q7-1 0-12Z" fill="#bceffd" stroke="#efffff" strokeWidth="1" style={{animationDelay:`${i*.9}s`}} /></>}
    </g>)}
    {frost&&FLAKES.map(([x,y],i)=><Spark key={i} x={x} y={y} size={4} delay={i*.75} />)}
  </>;
}

function Feathers({ id }: { id: string }) {
  return <>{[[222,130,-25,1.1],[280,93,16,1.2],[326,160,33,.9],[171,177,-39,.9]].map(([x,y,a,s],i)=><g className="vase-art-feather" key={i} style={{animationDelay:`${i*1.7}s`,transformOrigin:`${x}px 330px`}}>
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 220Q-8 101-1 0C-42 18-49 80-30 128C-20 151-6 164-2 170C21 136 32 78 16 30C11 15 5 5-1 0Z" fill={`url(#${id}-feather)`} stroke="#a58d67" strokeWidth="1.1" />
      <path d="M0 222Q-7 100-1 7" fill="none" stroke="#d0b48a" strokeWidth="2" />
      {Array.from({length:15},(_,j)=><path key={j} d={`M-3 ${35+j*8}Q${-30+Math.abs(7-j)} ${31+j*8} ${-31+Math.abs(7-j)*2.4} ${14+j*8}M-2 ${32+j*8}Q${25-Math.abs(6-j)} ${20+j*8} ${21-Math.abs(7-j)*1.6} ${7+j*8}`} fill="none" stroke={j%3===0?"#c2b371":"#7c9da8"} strokeWidth=".8" opacity=".64" />)}
    </g>
  </g>)}</>;
}

function Pencils() {
  const colors=["#a56b9b","#788aaf","#9cba9b","#e5bb69","#bd6a61","#cba0ad","#7499ab"];
  return <>{colors.map((color,i)=><g key={i} transform={`translate(${202+i*16} ${127+Math.abs(3-i)*15}) rotate(${(i-3)*7})`}>
    <path d="M-7 13L0-16L7 13Z" fill="#d5b98a" stroke="#95764a" strokeWidth="1" /><path d="M-3-4 0-16 3-4Z" fill={color} />
    <path d="M-7 13H7V222H-7Z" fill={color} stroke="#665f60" strokeWidth="1" /><path d="M-6 13H-2V222H-6Z" fill="#fff4c6" opacity=".28" /><path d="M3 13H7V222H3Z" fill="#2c2538" opacity=".25" />
    <path d="M-7 204H7M-7 210H7" stroke="#b9aa7e" strokeWidth="2" />
  </g>)}</>;
}

function Pinwheels({ id }: { id: string }) {
  return <>{[[180,200,.92,-12],[303,147,1.13,11],[290,254,.7,4]].map(([x,y,s,a],i)=><g key={i}>
    <path d={`M${x} ${y}Q${252+a} 300 ${254+a} 347`} fill="none" stroke="#c8a576" strokeWidth="4" />
    <g transform={`translate(${x} ${y}) scale(${s})`}><g className="vase-art-pinwheel" style={{animationDelay:`${i*-3}s`}}>
      {["#b98cb5","#83a9b6","#d2b472","#87a68e"].map((c,j)=><g key={j} transform={`rotate(${j*90})`}><path d="M0 0-57-9-45-61 0-16Z" fill={c} stroke="#ead7b4" strokeWidth="1.5" /><path d="M0 0-45-61-13-39Z" fill="#f1deb4" opacity=".52" /><path d="M0 0-57-9-25-17Z" fill="#30243b" opacity=".2" /></g>)}
      <circle r="7" fill={`url(#${id}-gold)`} stroke="#f4ddb0" strokeWidth="1" />
    </g></g>
  </g>)}</>;
}

function Scallions({ id }: { id: string }) {
  return <>{[[217,15],[247,-8],[277,13],[295,28]].map(([x,a],i)=><g key={i} transform={`rotate(${a} ${x} 323)`}>
    <path d={`M${x-8} 302Q${x-20} 182 ${x-36} 120Q${x-4} 137 ${x+2} 291Q${x+5} 148 ${x+22} 99Q${x+34} 173 ${x+10} 302Z`} fill={`url(#${id}-scallion)`} stroke="#98a46b" strokeWidth="1.1" />
    <path d={`M${x-9} 289Q${x-13} 327 ${x} 344Q${x+14} 330 ${x+10} 289Z`} fill={`url(#${id}-ivory)`} stroke="#d8d3ae" strokeWidth="1.3" />
    <path d={`M${x-3} 342q-8 12-6 20m9-18 1 18m3-21q8 11 7 18`} fill="none" stroke="#bd9c73" strokeWidth="1" />
  </g>)}</>;
}

function Garlic({ id }: { id: string }) {
  return <>{[[209,241,-20,.9],[303,221,22,1],[255,179,-5,1.2]].map(([x,y,a,s],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    <path d="M-6 83Q0-35-14-82L-4-89Q14-36 9 83" fill={`url(#${id}-scallion)`} stroke="#aba47f" strokeWidth="1" />
    <path d="M-4-20C-27-4-42 1-38 28Q-33 58-1 58C33 60 45 39 37 16C30-1 8-6-4-20Z" fill={`url(#${id}-garlic)`} stroke="#d0bea9" strokeWidth="1.8" />
    <path d="M-4-17Q-19 16-16 54M-2-14Q5 18-1 57M1-13Q24 10 20 52M-18-8Q-34 15-29 41M20 1Q36 15 31 36" fill="none" stroke="#bda3b4" strokeWidth="1.5" opacity=".8" />
    <path d="M-9 58q-11 11-6 17m8-17-1 18m6-18 5 16m-2-16 10 12" fill="none" stroke="#c0a47c" strokeWidth="1.1" />
    <path d="M-18 8q-9 8-6 20" fill="none" stroke="#fff4df" strokeWidth="4" strokeLinecap="round" opacity=".58" />
  </g>)}</>;
}

function Bananas({ id }: { id: string }) {
  return <g transform="translate(254 218)">
    {[-47,-25,2,26,48].map((a,i)=><g key={i} transform={`rotate(${a}) translate(${(i-2)*5} ${Math.abs(i-2)*5})`}>
      <path d="M-1-72C-21-26-22 13 17 59C31 77 54 87 70 80C33 67 7 9 20-61Z" fill={`url(#${id}-banana)`} stroke="#b2974b" strokeWidth="1.6" />
      <path d="M11-55C-2 1 14 45 51 68" fill="none" stroke="#fff0a3" strokeWidth="3" opacity=".7" /><path d="M18-52C12 6 28 47 63 72" fill="none" stroke="#b48839" strokeWidth="1.1" opacity=".55" />
      <path d="M-1-72 4-87 24-79 20-61Z" fill="#6e7441" stroke="#4e5131" strokeWidth="1.4" /><path d="M63 77 70 80 72 85 65 84Z" fill="#6c4d35" />
      <circle cx="24" cy="46" r="1.2" fill="#9a7940" opacity=".55" />
    </g>)}
    <path d="M-28 99Q0 82 24 104L18 128H-20Z" fill="#898349" stroke="#b9ab64" strokeWidth="2" />
  </g>;
}

function Carrots({ id }: { id: string }) {
  return <>{[[204,231,-24,.95],[294,223,22,.96],[251,190,-2,1.1]].map(([x,y,a,s],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
    {[-35,-15,8,29].map((angle,j)=><g key={j} transform={`rotate(${angle})`}><path d="M0 5Q-8-46 1-105M-1-29l-16-18m17 1 18-17M1-67l-13-14m14 1 13-12" fill="none" stroke={j%2?"#8caa63":"#5e8d55"} strokeWidth="5" strokeLinecap="round" /><path d="M-12-46l-12-4m27-12 18-4M-8-78l-9-7" stroke="#93b16b" strokeWidth="3.5" strokeLinecap="round" /></g>)}
    <path d="M-24 5Q-37 41-6 115Q-2 127 2 116C37 38 35 6 16 0Q-5-10-24 5Z" fill={`url(#${id}-carrot)`} stroke="#bb713e" strokeWidth="1.5" />
    <path d="M-15 14Q-23 46-4 98" fill="none" stroke="#f9c278" strokeWidth="4" opacity=".62" strokeLinecap="round" /><path d="M8 19l15-3M-24 35l13 3M6 51l14-4M-16 66l11 3M1 88l8-2" fill="none" stroke="#b5703e" strokeWidth="1.7" strokeLinecap="round" />
  </g>)}</>;
}

function Cloud({ id, x = 256, y = 160, scale = 1 }: { id: string; x?: number; y?: number; scale?: number }) {
  return <g className="vase-art-cloud" transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M-75 29C-102 24-99-13-72-18C-78-48-44-65-19-43C-4-81 48-75 57-37C91-47 111-19 92 8C110 34 78 48 58 40H-64Z" fill={`url(#${id}-cloud)`} stroke="#c8d0e2" strokeWidth="1.7" />
    <path d="M-66-11Q-56-36-31-22M-5-39Q13-57 35-42M58-18Q81-23 85-5" fill="none" stroke="#e8dce7" strokeWidth="3.5" strokeLinecap="round" opacity=".6" />
    <path d="M-58 30Q-12 44 37 34T83 18" fill="none" stroke="#777c9d" strokeWidth="3" opacity=".45" />
  </g>;
}

function Weather({ id, reverse = false }: { id: string; reverse?: boolean }) {
  return <><Cloud id={id} y={168} />
    <g className={reverse?"vase-art-rain vase-art-rain-reverse":"vase-art-rain"}>
      {Array.from({length:17},(_,i)=>{const x=190+(i*31%137);return <path key={i} className="vase-art-raindrop" d={`M${x} ${219+i%3*11}q-5 9 0 11q5-2 0-11Z`} fill="#a8d6e0" stroke="#e4f7ff" strokeWidth=".7" style={{animationDelay:`${i*-.29}s`,animationDuration:`${1.8+i%4*.23}s`}} />;})}
    </g>
    {[0,1,2].map(i=><ellipse className="vase-art-ripple" key={i} cx={258} cy={326} rx={10+i*6} ry={2+i*.6} fill="none" stroke="#bfe5f2" strokeWidth="1.2" style={{animationDelay:`${i*.8}s`}} />)}
  </>;
}

function Rainbow({ id }: { id: string }) {
  const colors=["#d98991","#dfb077","#e2cf85","#92ba9a","#82b4cc","#9f97c5","#c29cc8"];
  return <><g className="vase-art-rainbow">
    {colors.map((color,i)=><path key={color} d={`M${143+i*9} 244A${113-i*9} ${113-i*9} 0 0 1 ${369-i*9} 244`} fill="none" stroke={color} strokeWidth="8.5" strokeLinecap="round" opacity=".82" />)}
    <path className="vase-art-rainbow-shine" d="M149 244A107 107 0 0 1 363 244" fill="none" stroke="#fff5dd" strokeWidth="2.5" />
    <Cloud id={id} x={154} y={249} scale={.3} /><Cloud id={id} x={357} y={248} scale={.3} />
    <path d="M196 270Q241 293 254 327M318 270Q278 303 260 327" fill="none" stroke="#a6c5c7" strokeWidth="1.5" opacity=".6" />
  </g><path className="vase-art-rainbow-drop" d="M258 282q-6 11 0 12q6-1 0-12Z" fill="#c7ebf2" stroke="#efffff" strokeWidth="1" />
    {[[199,132],[313,144],[341,217]].map(([x,y],i)=><Spark key={i} x={x} y={y} delay={i*.8} size={5} />)}
  </>;
}

function CrystalFlower({ id, x, y, scale = 1 }: { id: string; x: number; y: number; scale?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {PETAL_ANGLES.map((a,i)=><g key={a} transform={`rotate(${a})`}><path d="M0 6-23-29-11-67 13-52 23-24Z" fill={`url(#${id}-ice)`} stroke="#d3eff9" strokeWidth="1.5" /><path d="M0 6-11-67 4-31 13-52M-23-29 4-31 23-24M4-31 0 6" fill="none" stroke="#f2ffff" strokeWidth="1" opacity=".72" /><path className="vase-art-crystal-facet" d="M-23-29-11-67 4-31Z" fill="#fffaff" opacity=".5" style={{animationDelay:`${i*.7}s`}} /></g>)}
    <path d="m0-17 17 8-2 21-16 8-16-12 2-18Z" fill="#a7d2ed" stroke="#f1ffff" strokeWidth="1.8" /><path d="m0-17 1 19 16-11M1 2l14 10M1 2-16 6M1 2l-2 18M1 2-14-12" stroke="#efffff" strokeWidth="1.1" fill="none" />
  </g>;
}

function IceFlowers({ id }: { id: string }) {
  return <><Stem d="M248 337Q225 237 194 184M263 338Q287 221 322 220M255 338Q270 214 266 124" frost />
    <Leaf x={249} y={313} angle={-3} frost scale={.85} id={id} /><Leaf x={272} y={295} angle={147} frost scale={.85} id={id} />
    <CrystalFlower id={id} x={194} y={186} scale={.78} /><CrystalFlower id={id} x={321} y={218} scale={.7} /><CrystalFlower id={id} x={266} y={124} scale={.93} />
    {FLAKES.map(([x,y],i)=><Spark key={i} x={x} y={y} delay={i*.75} size={4} />)}
  </>;
}

function Branches({ id, cranes = false }: { id: string; cranes?: boolean }) {
  const branches="M256 340Q262 242 246 149L231 97M254 294Q209 244 156 218L123 171M249 239Q204 189 178 128M257 263Q311 224 342 167L355 120M258 318Q319 287 370 233M247 165l52-52M179 230l2-50M317 212l47-7";
  return <><path d={branches} fill="none" stroke={cranes?"#9a775b":"#af926a"} strokeWidth="4.5" strokeLinecap="round" /><path d="M258 336Q266 244 250 155M255 292q-41-48-90-69M260 264q46-38 77-90" fill="none" stroke="#e0bb7d" strokeWidth="1.1" opacity=".6" />
    {cranes?[[163,207,-15,.9],[247,143,12,1.05],[344,166,-5,.85],[329,283,20,.7],[195,268,0,.65]].map(([x,y,a,s],i)=><g key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M-8 5-26-18 2-4 16 12Z" fill="#c5b9c5" stroke="#f2e1ca" strokeWidth="1.2" />
      <path className="vase-art-crane-wing" d="M0 2-52-34-33 10 16 12Z" fill={`url(#${id}-paper)`} stroke="#f6e6c7" strokeWidth="1.3" style={{animationDelay:`${i*1.9}s`}} />
      <path d="M-33 10 0 2-52-34M0 2l16 10" fill="none" stroke="#b89b89" strokeWidth="1" />
      <path d="M12 11 27-11 39-13 27-4 22 16Z" fill="#f0ddba" stroke="#e7cfaf" strokeWidth="1" /><path d="m27-11 12-2-7 7Z" fill="#a37367" />
      <path d="M13 12-17 22-6 7Z" fill="#d5c1ad" stroke="#f0dfc5" strokeWidth="1" />
    </g>):STARS.map(([x,y],i)=><g key={i}><path d={`M${x} ${y}q-2 14 1 25`} fill="none" stroke="#cba76d" strokeWidth="1" /><g className="vase-art-hanging-star" style={{animationDelay:`${i*.8}s`,transformOrigin:`${x}px ${y}px`}}><path d={`m${x} ${y+13} 4.7 9.4 10.3 1.5-7.5 7.3 1.8 10.3-9.3-4.9-9.3 4.9 1.8-10.3-7.5-7.3 10.3-1.5Z`} fill={`url(#${id}-gold)`} stroke="#f5ddb0" strokeWidth="1" /><circle cx={x-2} cy={y+27} r="2" fill="#fff7d3" opacity=".8" /></g></g>)}
  </>;
}

function Aurora({ id }: { id: string }) {
  return <><ellipse className="vase-art-aurora-pool" cx="258" cy="325" rx="35" ry="6" fill="#9fe6d3" opacity=".6" />
    {[0,1,2].map((i)=><g key={i} className={`vase-art-aurora-ribbon vase-art-aurora-ribbon-${i}`}>
      <path d={i===0?"M245 324C144 277 357 241 236 197S149 111 286 95C222 135 383 167 278 211S177 273 245 324Z":i===1?"M265 325C352 278 192 261 284 221S358 151 267 124C330 180 145 204 246 244S312 302 265 325Z":"M255 327C192 286 292 252 213 230S129 160 211 127C172 181 320 201 242 257S224 304 255 327Z"} fill={`url(#${id}-aurora-${i})`} opacity={i===2?.6:.8} />
      <path d={i===0?"M245 324C144 277 357 241 236 197S149 111 286 95":i===1?"M265 325C352 278 192 261 284 221S358 151 267 124":"M255 327C192 286 292 252 213 230S129 160 211 127"} fill="none" stroke={i===1?"#c9acf5":"#b4f2de"} strokeWidth="1.3" opacity=".75" />
    </g>)}
    {FLAKES.map(([x,y],i)=><Spark key={i} x={x} y={y} size={3} delay={i*.72} />)}
  </>;
}

function InkFlower({ id }: { id: string }) {
  return <><path d="M255 340C270 283 240 256 260 229" fill="none" stroke={`url(#${id}-ink)`} strokeWidth="7" strokeLinecap="round" /><Leaf x={256} y={298} angle={3} scale={.78} id={id} /><Leaf x={261} y={278} angle={149} scale={.65} id={id} />
    <g className="vase-art-ink-flower" style={{transformOrigin:"257px 202px"}}>
      {[0,1,2].map(layer=><g key={layer} transform={`translate(257 202) rotate(${layer*23}) scale(${1-layer*.22})`}>
        {Array.from({length:7},(_,i)=><path key={i} transform={`rotate(${i*360/7})`} d="M0 21C-63 32-88-29-53-54C-37-67-7-53 0-84C35-58 65-18 35 14C21 29 7 29 0 21Z" fill={`url(#${id}-ink)`} stroke="#8b8ead" strokeWidth="1.15" opacity={.86+layer*.04} />)}
      </g>)}
      <path d="M249 194q19-20 25 1q5 19-14 20q-22-4-11-21Z" fill="#18243b" stroke="#98abbf" strokeWidth="1.3" /><circle cx="256" cy="197" r="3" fill="#a9c6d2" opacity=".7" />
    </g>
    {[[-63,14],[54,-57],[83,33]].map(([dx,dy],i)=><path className="vase-art-ink-droplet" key={i} d={`M${257+dx} ${202+dy}q-7 13 1 15q7-4-1-15Z`} fill="#344861" stroke="#8aa0b5" strokeWidth="1" style={{animationDelay:`${i*.9}s`}} />)}
  </>;
}

function DiamondRose({ id }: { id: string }) {
  return <><path d="M257 341Q274 273 256 200" fill="none" stroke={`url(#${id}-gold)`} strokeWidth="5" />
    <g fill={`url(#${id}-ice)`} stroke="#d8f5ff" strokeWidth="1.4"><path d="M265 289 304 252 328 247 318 276 265 289Z" /><path d="M260 306 219 269 187 270 207 297 260 306Z" /><path d="M265 289 328 247M260 306 187 270" fill="none" stroke="#fff7df" strokeWidth="1" /></g>
    <g className="vase-art-diamond-rose" transform="translate(256 175)">
      {Array.from({length:8},(_,i)=><g key={i} transform={`rotate(${i*45})`}><path d="M0 25-58 10-73-30-36-65 13-49 32-14Z" fill={`url(#${id}-diamond)`} stroke="#deeeff" strokeWidth="1.8" /><path d="M0 25-36-65-18-11-73-30M-18-11 13-49M-18-11 32-14M-58 10-18-11" fill="none" stroke="#edfaff" strokeWidth="1" opacity=".8" /><path className="vase-art-crystal-facet" d="M-73-30-36-65-18-11Z" fill="#fffdf2" opacity=".4" style={{animationDelay:`${i*.43}s`}} /></g>)}
      {Array.from({length:5},(_,i)=><path key={i} transform={`rotate(${i*72+18})`} d="M0 15-26-8-18-37 15-31 28-4Z" fill={`url(#${id}-diamond)`} stroke="#f1fcff" strokeWidth="1.7" />)}
      <path d="m0-19 17 11-5 21-20 4-12-17Z" fill="#c2dff1" stroke="#fffff2" strokeWidth="1.6" /><path d="m0-19 1 20 16-9M1 1l11 12M1 1-21-1M1 1-8 17" fill="none" stroke="#fffbea" strokeWidth="1" />
    </g>
    {[[192,118],[313,148],[224,229],[296,215],[262,91],[310,280]].map(([x,y],i)=><Spark key={i} x={x} y={y} delay={i*.53} size={i===0?10:6} />)}
  </>;
}

function Crown({ id }: { id: string }) {
  return <g className="vase-art-crown" style={{transformOrigin:"282px 169px"}}>
    <path d="M236 134 242 172Q282 184 322 170L328 131 304 148 284 115 264 148Z" fill={`url(#${id}-gold)`} stroke="#ffe2a0" strokeWidth="1.7" />
    <path d="M242 166Q283 179 323 164L322 174Q281 187 243 176Z" fill="#b27b29" stroke="#f5d490" strokeWidth="1.8" />
    <path d="M248 148 254 164M277 139 278 169M309 150l-5 17" stroke="#fff3b4" strokeWidth="2.5" opacity=".8" />
    {[[236,133],[284,114],[328,130]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="5" fill={`url(#${id}-gold)`} stroke="#fff0b5" strokeWidth="1" />)}
    <path d="m282 153 6 7-5 8-6-8Z" fill="#b678be" stroke="#ffe5a3" strokeWidth="1" /><circle cx="253" cy="165" r="2.5" fill="#a7cfbc" /><circle cx="310" cy="166" r="2.5" fill="#a7cfbc" />
  </g>;
}

function RoyalCabbage({ id }: { id: string }) {
  return <><image href="/club-vase-cabbage.png" width="512" height="512" />
    <g className="vase-art-royal-halo"><ellipse cx="283" cy="200" rx="120" ry="103" fill={`url(#${id}-royal-halo)`} /></g>
    <Crown id={id} />
    <path className="vase-art-crown-leaf" style={{transformOrigin:"327px 223px"}} d="M327 223Q337 189 323 168Q301 170 313 190Q324 204 327 223Z" fill={`url(#${id}-leaf)`} stroke="#d3bd65" strokeWidth="1.5" />
    {[[156,143],[344,114],[388,226],[183,281],[341,287],[247,111],[136,235],[290,327],[349,363],[203,384],[292,90]].map(([x,y],i)=><Spark key={i} x={x} y={y} delay={i*.37} size={i%3===0?9:5} gold />)}
  </>;
}

function Definitions({ id }: { id: string }) {
  const linear=(name:string,stops:[string,string][],x2="1",y2="1")=><linearGradient key={name} id={`${id}-${name}`} x2={x2} y2={y2}>{stops.map(([offset,color])=><stop key={offset} offset={offset} stopColor={color} />)}</linearGradient>;
  return <defs>
    {linear("vessel",[["0","#321734"],[".26","#5a225d"],[".52","#2b1536"],[".78","#642246"],["1","#ca7835"]])}
    {linear("gold",[["0","#805121"],[".25","#dba24c"],[".48","#ffdfa0"],[".65","#bc7e31"],["1","#f2cb79"]])}
    {linear("leaf",[["0","#a3a65f"],[".32","#748953"],[".72","#3f684d"],["1","#294839"]])}
    {linear("scallion",[["0","#91aa72"],[".36","#547d4d"],[".75","#bacb99"],["1","#eee9cb"]],"0","1")}
    {linear("ivory",[["0","#fff9df"],[".4","#eae5cb"],["1","#a2ae96"]])}
    {linear("garlic",[["0","#fbefd7"],[".35","#e4d9c8"],[".7","#c1a8bc"],["1","#b3a2a3"]])}
    {linear("iris",[["0","#d0b2dd"],[".36","#8d78bd"],[".75","#565ba0"],["1","#343765"]])}
    {linear("iris-dark",[["0","#a59acc"],[".5","#6c559f"],["1","#3e3464"]])}
    {linear("hydrangea",[["0","#ddd9ef"],[".35","#a6bbd7"],["1","#6b84ad"]])}
    {linear("hydrangea-pink",[["0","#e6d5ed"],[".5","#b2a0c7"],["1","#7d759f"]])}
    {linear("feather",[["0","#568184"],[".25","#2d5362"],[".5","#4d496f"],[".8","#4b7b74"],["1","#aa9e69"]])}
    {linear("banana",[["0","#f7d773"],[".4","#d9b250"],[".7","#f1cf67"],["1","#9f8d40"]])}
    {linear("carrot",[["0","#f0b66e"],[".35","#d68e4d"],[".7","#c67b3b"],["1","#945b36"]])}
    {linear("cloud",[["0","#e1d9e4"],[".4","#b9b7ce"],["1","#717b9f"]],"0","1")}
    {linear("ice",[["0","#ecffff"],[".25","#b3e5ec"],[".48","#87b7db"],[".7","#d8edff"],["1","#8ba5d3"]])}
    {linear("diamond",[["0","#fff8ee"],[".2","#c5e4f3"],[".4","#9fb9df"],[".62","#e2e4fd"],[".8","#b3dce7"],["1","#f8e9f7"]])}
    {linear("paper",[["0","#fff0cf"],[".4","#e9d7ba"],["1","#bba3a1"]])}
    {linear("ink",[["0","#6d7e9c"],[".2","#354d70"],[".6","#202c4a"],["1","#111c32"]])}
    <linearGradient id={`${id}-aurora-0`} x2=".7" y2="1"><stop stopColor="#c8f0d1" stopOpacity=".08" /><stop offset=".35" stopColor="#82d4c2" stopOpacity=".7" /><stop offset=".6" stopColor="#aca2df" stopOpacity=".3" /><stop offset="1" stopColor="#a7e8cb" stopOpacity=".75" /></linearGradient>
    <linearGradient id={`${id}-aurora-1`} x2=".3" y2="1"><stop stopColor="#ab9bdc" stopOpacity=".1" /><stop offset=".4" stopColor="#b59edb" stopOpacity=".65" /><stop offset="1" stopColor="#90d6d8" stopOpacity=".45" /></linearGradient>
    <linearGradient id={`${id}-aurora-2`} x2=".8" y2="1"><stop stopColor="#99d4ca" stopOpacity=".1" /><stop offset=".4" stopColor="#b4d8ab" stopOpacity=".65" /><stop offset="1" stopColor="#dccb97" stopOpacity=".15" /></linearGradient>
    <radialGradient id={`${id}-royal-halo`}><stop stopColor="#ffdc64" stopOpacity=".19" /><stop offset=".6" stopColor="#e4b240" stopOpacity=".07" /><stop offset="1" stopColor="#e4b240" stopOpacity="0" /></radialGradient>
  </defs>;
}

/** Independent illustration layer. Existing assets keep their original image bytes and styling. */
export function VaseArtwork({ selection, celebrated = false }: ArtProps) {
  const id = `vase-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  if (ORIGINALS.has(selection)) return <span className="vase-artwork vase-artwork-original"><img className="club-vase-object-image" src={`/club-vase-${selection}.png`} width="512" height="512" alt="" draggable={false} /></span>;
  let content: ReactNode;
  switch (selection) {
    case "iris": content=<Irises id={id} />; break;
    case "hydrangea": content=<Hydrangea id={id} />; break;
    case "lily-of-the-valley": content=<Lilies id={id} />; break;
    case "feathers": content=<Feathers id={id} />; break;
    case "pencils": content=<Pencils />; break;
    case "pinwheels": content=<Pinwheels id={id} />; break;
    case "scallions": content=<Scallions id={id} />; break;
    case "garlic": content=<Garlic id={id} />; break;
    case "bananas": content=<Bananas id={id} />; break;
    case "carrots": content=<Carrots id={id} />; break;
    case "rainbow": content=<Rainbow id={id} />; break;
    case "rain-cloud": content=<Weather id={id} />; break;
    case "reverse-rain": content=<Weather id={id} reverse />; break;
    case "ice-flower": content=<IceFlowers id={id} />; break;
    case "ice-lily": content=<Lilies id={id} frost />; break;
    case "star-branches": content=<Branches id={id} />; break;
    case "crane-branches": content=<Branches id={id} cranes />; break;
    case "aurora": content=<Aurora id={id} />; break;
    case "ink-flower": content=<InkFlower id={id} />; break;
    case "royal-rose": content=<DiamondRose id={id} />; break;
    case "royal-cabbage": content=<RoyalCabbage id={id} />; break;
    default: return <span className="vase-artwork vase-artwork-original"><img className="club-vase-object-image" src="/club-vase-autumn.png" width="512" height="512" alt="" draggable={false} /></span>;
  }
  return <span className={`vase-artwork vase-scene-${selection}${celebrated?" vase-artwork-celebrated":""}`}>
    <svg viewBox="0 0 512 512" width="512" height="512" fill="none" aria-hidden="true" focusable="false">
      <Definitions id={id} />{content}{selection!=="royal-cabbage"&&<Vase id={id} />}
    </svg>
  </span>;
}
