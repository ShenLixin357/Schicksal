/** V10 approved public emblem. No Lounge imports, network calls or private state.
 * Browser renderer is self-contained so public entry can embed it under CSP nonce. */
export const EMBLEM_MOTION = Object.freeze({width:20,lengthRatio:4.236,shoulder:.618,innerRadius:3,shoulderTrim:.01,grow:420,interval:230,hold:900,scatter:350,scatterInterval:28,openingDelay:360,openingDuration:4200,loadingPeriod:4300,loadingSteps:15,loadingLighten:.3,ringWidth:2.875,ringMinor:13,ringMajor:86});
export type MotionMode = "static" | "opening" | "loading";
export type BladePose = {i:number;angle:number;opacity:number;scale:number;dy:number};
export function bladeOutline(): string {
  const w=10,L=20*4.236,top=-3-L,bottom=-3,y=top+L*.618,t=20*.01;
  const upper=Math.hypot(w,y-top),lower=Math.hypot(w,bottom-y);
  const ux=w*(1-t/upper),uy=y-(y-top)*t/upper;
  const lx=w*(1-t/lower),ly=y+(bottom-y)*t/lower;
  return "M 0 "+top+" L "+ux+" "+uy+" Q "+w+" "+y+" "+lx+" "+ly+" L 0 "+bottom+" L "+(-lx)+" "+ly+" Q "+(-w)+" "+y+" "+(-ux)+" "+uy+" Z";
}
export function emblemFacets(colors:readonly string[],lighten=0): [string,string][] {
  return colors.map(color=>{
    const rgb=[1,3,5].map(n=>parseInt(color.slice(n,n+2),16));
    const mix=(target:number,amount:number)=>"rgb("+rgb.map(v=>Math.round(Math.round(v*(1-amount)+target*amount)*(1-lighten)+255*lighten)).join(",")+")";
    return [mix(255,.18),mix(0,.055)];
  });
}
/** Deterministic equal-beat motion; back-to-front painter order. */
export function sampleEmblem(mode:MotionMode,age:number,revealed=8): BladePose[] {
  const poses:BladePose[]=[];
  const add=(i:number,angle=i*45,opacity=1,scale=1,dy=0)=>poses.push({i,angle,opacity,scale,dy});
  const clamp=(x:number)=>Math.max(0,Math.min(1,x));
  const smooth=(x:number)=>{x=clamp(x);return x*x*(3-2*x);};
  if(mode==="static"){for(let i=Math.min(8,revealed)-1;i>=0;i--)add(i);return poses;}
  if(mode==="loading"){
    const phase=((age%4300+4300)%4300)/4300*15,step=Math.min(14,Math.floor(phase)),p=phase-step;
    if(step<7){if(p>0)add(step+1,step*45+45*p);for(let i=step;i>=0;i--)add(i);}
    else if(step<14){const i=step-7;add(i,i*45+45*p);for(let j=i+1;j<8;j++)add(j);}
    else{add(7,315+45*p);}
    return poses;
  }
  const elapsed=age-360,L=20*4.236;
  for(let i=7;i>=0;i--){
    const enter=clamp((elapsed-i*230)/420),p=1-Math.pow(1-enter,3);
    const out=clamp((elapsed-(7*230+420+900)-i*28)/350),q=out*out;
    const scale=(.18+.82*p)*(1-.26*q),opacity=smooth(enter/.7)*(1-smooth(out));
    if(opacity>0)add(i,i*45,opacity,scale,(1-p)*(L*.42+3)-q*105-3+scale*3);
  }
  return poses;
}
/** Shared 3x physical-pixel supersampling matches V10. */
export function mountEmblem(canvas:HTMLCanvasElement,mode:MotionMode,pathSource:string,palette:readonly (readonly string[])[],sample:typeof sampleEmblem,revealed=8):()=>void {
  const output=canvas.getContext("2d"),buffer=document.createElement("canvas"),ctx=buffer.getContext("2d");
  if(!output||!ctx||typeof Path2D==="undefined")return ()=>{};
  const path=new Path2D(pathSource),reduce=window.matchMedia("(prefers-reduced-motion: reduce)");
  let disposed=false,frame=0,lastSize=0;
  const started=performance.now();
  const orbit=mode==="opening"?canvas.parentElement?.querySelector<HTMLElement>(".opening-orbit-v10"):null;
  const paint=(now:number)=>{
    if(disposed)return;
    const width=canvas.getBoundingClientRect().width;
    if(width<=0)return;
    const size=Math.max(1,Math.min(768,Math.round(width*(window.devicePixelRatio||1)))),hi=Math.min(2304,size*3);
    if(canvas.width!==size||canvas.height!==size){canvas.width=size;canvas.height=size;}
    if(buffer.width!==hi||buffer.height!==hi){buffer.width=hi;buffer.height=hi;}
    lastSize=size;
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,hi,hi);ctx.setTransform(hi/224,0,0,hi/224,hi/2,hi/2);
    const age=now-started;
    // Keep the original opening orbit on exactly the same clock as its blades.
    // Separate CSS animation timelines may drift during WebKit startup/replay.
    if(orbit){
      const clamp=(v:number)=>Math.max(0,Math.min(1,v));
      const rise=reduce.matches?1:clamp((age-2390)/650);
      const fall=reduce.matches?0:clamp((age-3290)/350);
      const eased=rise*rise*(3-2*rise);
      orbit.style.opacity=String(eased*(1-fall*fall));
      orbit.style.transform="scale("+(.72+.28*eased+.12*fall)+")";
    }
    for(const r of sample(reduce.matches?"static":mode,age,revealed)){
      ctx.save();ctx.rotate(r.angle*Math.PI/180);ctx.translate(0,r.dy);ctx.scale(r.scale,r.scale);ctx.globalAlpha=r.opacity;
      const g=ctx.createLinearGradient(-10,0,10,0),c=palette[r.i];g.addColorStop(0,c[0]);g.addColorStop(.5,c[0]);g.addColorStop(.5,c[1]);g.addColorStop(1,c[1]);ctx.fillStyle=g;ctx.fill(path);ctx.restore();
    }
    output.setTransform(1,0,0,1,0,0);output.clearRect(0,0,size,size);output.imageSmoothingEnabled=true;output.imageSmoothingQuality="high";output.drawImage(buffer,0,0,size,size);
  };
  const tick=()=>{frame=0;if(disposed)return;const now=performance.now();paint(now);if(!reduce.matches&&(mode==="loading"||mode==="opening"&&now-started<4200))frame=requestAnimationFrame(tick);};
  const resume=()=>{if(frame)cancelAnimationFrame(frame);frame=0;tick();};
  const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(()=>{
    const size=Math.max(1,Math.min(768,Math.round(canvas.getBoundingClientRect().width*(window.devicePixelRatio||1))));
    if(size!==lastSize)paint(performance.now());
  }):null;
  observer?.observe(canvas);reduce.addEventListener("change",resume);resume();
  return ()=>{disposed=true;if(frame)cancelAnimationFrame(frame);observer?.disconnect();reduce.removeEventListener("change",resume);};
}
export function technologyRingSvg(colors:readonly string[]):string {
  return '<svg viewBox="-112 -112 224 224" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">'+
    Array.from({length:4},(_,i)=>'<g transform="rotate('+(i*45)+')" fill="none" stroke-width="'+EMBLEM_MOTION.ringWidth+'" stroke-linecap="round"><path d="M -13 0 A 13 86 0 0 1 13 0" stroke="'+colors[i]+'"/><path d="M 13 0 A 13 86 0 0 1 -13 0" stroke="'+colors[i+4]+'"/></g>').join("")+'</svg>';
}
