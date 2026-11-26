const colors=['#ffe27e','#5ec5ff','#ff7990','#74e6a5','#b9f5ff','#ffb0df','#ffba72','#aa8cff'];
const candles=[[148,374,31],[380,498,27],[1296,500,28],[1495,454,34],[178,626,23],[430,622,22],[1245,630,25],[1492,627,25],[1551,778,70]];
const candleSpill=[...candles,[612,670,22],[933,632,22]];
const windows=[[612,428,84,248],[833,428,173,260],[1064,429,90,251]];
const rgb=hex=>`rgb(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)})`;

function glow(ctx,x,y,rx,ry,color,opacity){
 if(opacity<=0)return;
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
 const g=ctx.createRadialGradient(0,0,0,0,0,1);
 g.addColorStop(0,color.replace(')',`,${opacity})`).replace('rgb(','rgba('));
 g.addColorStop(.38,color.replace(')',`,${opacity*.43})`).replace('rgb(','rgba('));
 g.addColorStop(1,color.replace(')',',0)').replace('rgb(','rgba('));
 ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function mote(ctx,x,y,color,alpha,r=2.5,star=false){
 glow(ctx,x,y,r*2.4,r*2.5,rgb(color),alpha*.72);
 ctx.save();ctx.fillStyle=color;ctx.globalAlpha=alpha;ctx.beginPath();ctx.arc(x,y,r*.66,0,Math.PI*2);ctx.fill();
 if(star){ctx.strokeStyle=color;ctx.lineWidth=1.1;ctx.globalAlpha=alpha*.72;ctx.beginPath();ctx.moveTo(x-r*1.9,y);ctx.lineTo(x+r*1.9,y);ctx.moveTo(x,y-r*1.7);ctx.lineTo(x,y+r*1.7);ctx.stroke();}
 ctx.restore();
}
const fract=n=>n-Math.floor(n);
function floorPatch(ctx,color,x,y,w,h,tilt,opacity,seed){
 const rgba=(hex,a)=>`rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
 ctx.save();ctx.translate(x,y);ctx.rotate(tilt);
 const pts=[];for(let k=0;k<7;k++){const a=-Math.PI/2+k*Math.PI*2/7+(fract(seed*11.7+k*.37)-.5)*.22,r=.78+fract(seed*23.1+k*1.91)*.34;pts.push([Math.cos(a)*w*r,Math.sin(a)*h*r]);}
 ctx.beginPath();ctx.moveTo(...pts[0]);for(let k=1;k<pts.length;k++)ctx.lineTo(...pts[k]);ctx.closePath();
 const g=ctx.createRadialGradient(-w*.08,-h*.12,2,w*.02,h*.04,Math.max(w,h));
 g.addColorStop(0,rgba(color,.36));g.addColorStop(.42,rgba(color,.25));g.addColorStop(.78,rgba(color,.09));g.addColorStop(1,rgba(color,0));
 ctx.fillStyle=g;ctx.globalAlpha=opacity;ctx.shadowColor=color;ctx.shadowBlur=11;ctx.fill();ctx.restore();
}

export class LightingEffect{
 constructor(ctx,candleUnderpaint){this.ctx=ctx;this.candleUnderpaint=candleUnderpaint;}
 drawAmbient(level,elapsed){
  const ctx=this.ctx,offC=1-level.candle,offD=1-level.dome,offW=1-level.window;
  ctx.save();
  // Pixel-restored wicks and glass: all original pixels outside the feathered masks survive.
  if(offC>.001){ctx.globalAlpha=offC;ctx.drawImage(this.candleUnderpaint,0,0);ctx.globalAlpha=1;}
  if(offC>.001){
   ctx.fillStyle=`rgba(27,21,34,${offC*.105})`;ctx.fillRect(0,0,1671,941);
   glow(ctx,180,515,530,540,'rgb(26,19,31)',offC*.2);
   glow(ctx,1490,510,540,540,'rgb(26,19,31)',offC*.2);
   glow(ctx,836,658,470,230,'rgb(29,21,33)',offC*.11);
   glow(ctx,836,935,950,250,'rgb(29,22,34)',offC*.09);
   for(const [x,y,r] of candleSpill)glow(ctx,x,y,r*4.6,r*5.1,'rgb(30,23,34)',offC*.24);
  }
  // An exterior night is a cool dimming of the glass, not a black hole behind the emblem.
  const shade=offD*.095+offW*.11;
  if(shade>.001){ctx.fillStyle=`rgba(37,37,64,${shade})`;ctx.fillRect(0,0,1671,941);}
  if(offD>.001){glow(ctx,836,115,415,245,'rgb(53,59,91)',offD*.3);glow(ctx,836,803,535,126,'rgb(43,38,67)',offD*.12);}
  if(offW>.001){for(const [x,y,rx,ry] of windows)glow(ctx,x,y,rx*1.35,ry*1.09,'rgb(52,55,91)',offW*.28);glow(ctx,836,824,688,145,'rgb(46,41,75)',offW*.14);}
  ctx.globalCompositeOperation='screen';
  if(level.candle>.001)for(const [x,y,r] of candles){const flicker=.72+.28*Math.sin(elapsed/170+x*.19);glow(ctx,x,y,r*1.45,r*1.7,'rgb(255,194,105)',level.candle*.055*flicker);}
  // Dome points and stained-glass points can be turned off separately.
  for(let i=0;i<38;i++){
   const u=(i*127.71)%1,v=(i*83.31)%1,phase=elapsed/4200+i*1.31,pulse=(.5+.5*Math.sin(phase))**3;
   const roof=i<22,x=(roof?612:472)+u*(roof?448:727)+Math.sin(phase*.31)*5,y=roof?20+v*250:752+v*151;
   mote(ctx,x,y,colors[i%8],level.dome*(.17+.46*pulse),roof?3.1:4.6,i%6===0);
  }
  for(let i=0;i<72;i++){
   const u=(i*71.93)%1,v=(i*37.47)%1,phase=elapsed/3900+i*1.9,pulse=(.5+.5*Math.sin(phase))**4;
   const pane=i<46,x=(pane?490:296)+u*(pane?675:1075)+Math.sin(phase*.41)*8,y=pane?281+v*350:717+v*197;
   mote(ctx,x,y,colors[(i*3)%8],level.window*(.15+.52*pulse),pane?2.6:5.2,i%7===0);
  }
  ctx.restore();
 }
 drawCoreCast(level,elapsed){
  const ctx=this.ctx,offD=1-level.dome,offW=1-level.window,alone=offD*offW*(1-level.candle);
  const strength=.18+offD*.05+offW*.07+alone*.42;
  ctx.save();ctx.globalCompositeOperation='screen';
  // Fixed, soft stained-glass fragments confined to the exposed floor.
  ctx.beginPath();ctx.rect(100,690,1470,251);ctx.rect(100,700,355,241);ctx.rect(1365,700,205,205);ctx.rect(490,690,675,122);ctx.clip('evenodd');
  for(let i=0;i<36;i++){
   const u=fract(Math.sin((i+1)*37.719)*24634.6345),v=fract(Math.sin((i+1)*91.173+4.2)*13874.151);
   const x=330+u*1010,y=713+v*215,w=25+u*47,h=12+v*25;
   floorPatch(ctx,colors[i%colors.length],x,y,w,h,(u-.5)*.72,strength*(.42+.16*v),u+v);
  }
  ctx.restore();
 }
}
