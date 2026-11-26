import {imageOf} from '../../ladder/LadderRenderer.js';
import {defaultsFor,podium} from './routes.js';
import {createReadingSequence} from './roundtrip.js';
import {projectBody} from './rigid-book.js';

// The center and width come from the red circle on the original scene.
const dome={x:835,y:159};
const domeWidth=263;
const catchStart=.73;
const catchHeight=.94;
const reboundStart=.81;
const identityColor='#f3ed87';
const clamp=value=>Math.max(0,Math.min(1,value));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t);};
const radians=degrees=>degrees*Math.PI/180;
const assetRoot=new URL('../../../assets/book/multi/archive-v1/',import.meta.url);

function loadMark(file){
  return imageOf(new URL(file,assetRoot).href).then(image=>{
    const canvas=document.createElement('canvas');
    canvas.width=image.width;
    canvas.height=image.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(image,0,0);
    const {width,height}=canvas;
    const {data}=context.getImageData(0,0,width,height);
    let left=width,top=height,right=0,bottom=0;
    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        if(!data[(y*width+x)*4+3])continue;
        left=Math.min(left,x);top=Math.min(top,y);
        right=Math.max(right,x);bottom=Math.max(bottom,y);
      }
    }
    const w=right-left+1,h=bottom-top+1;
    return {image,source:[left,top,w,h],ratio:h/w};
  });
}

export async function loadArchiveMarks(){
  const [full,simple]=await Promise.all([loadMark('dome.webp'),loadMark('shelf.webp')]);
  return {full,simple};
}

// Free fall under constant gravity, then a damped spring that inherits the fall velocity.
function dropProgress(t,bounce){
  if(t<=catchStart)return catchHeight*(t/catchStart)**2;
  const elapsed=t-catchStart;
  const damping=15,frequency=20;
  const offset=catchHeight-1;
  const entryVelocity=2*catchHeight/catchStart;
  const momentum=(entryVelocity+damping*offset)/frequency;
  const oscillation=offset*Math.cos(frequency*elapsed)+momentum*Math.sin(frequency*elapsed);
  const gain=mix(1,bounce,smooth((elapsed-.024)/.048));
  const liftStart=mix(reboundStart,1,.20);
  const liftProgress=smooth((t-liftStart)/(1-liftStart));
  const lift=.019*bounce*Math.sin(Math.PI*liftProgress)**2;
  return 1+gain*oscillation*Math.exp(-damping*elapsed)*(1-smooth((t-.94)/.06))-lift;
}

// Change the rebound timing after the catch while preserving its height and endpoints.
function reboundTime(t,speed){
  if(t<=reboundStart)return t;
  const progress=(t-reboundStart)/(1-reboundStart);
  const rate=mix(1,speed,smooth(progress/.16));
  const warped=rate*progress/(1+(rate-1)*progress);
  return mix(reboundStart,1,warped);
}

export function createArchiveTrip(book,input,timing){
  const settings={...defaultsFor(book.id),...input};
  const [x0,y0,x1,y1]=book.box;
  const shelf={x:(x0+x1)/2,y:(y0+y1)/2};
  const shelfPeak=.20, domeStart=.42, domePeak=.67;
  const domeRecedes=domePeak+settings.domeHold;
  const appears=domeRecedes+.30;
  const reached=appears+settings.fallTime;
  const caught=appears+settings.fallTime*catchStart;
  const reading=createReadingSequence(book,settings,timing,reached);
  const {hoverPoint,hoverShape,rest,pickup,descend}=reading;
  const formsBeam=pickup+.27;
  const beamEnds=formsBeam+settings.beamTime;
  const bookAtDome=beamEnds+.14;
  const morphToMark=bookAtDome+.22;
  const returnPeak=morphToMark+.39;
  const shelfReturnStart=returnPeak+.25;
  const returns=shelfReturnStart+.19;
  const finish=returns+.44;
  const returnPose={...hoverShape,...dome,heading:radians(25),pitch:radians(-23),
    lean:radians(-18),scale:hoverShape.scale*.60,exposed:book.length};
  const release={...dome,y:dome.y-24};

  function fallingAt(progress){
    const t=clamp(progress);
    const sway=14*Math.sin(2*Math.PI*t)*Math.sin(Math.PI*t)**2;
    const verticalTime=reboundTime(t,settings.reboundSpeed);
    return {x:mix(release.x,hoverPoint.x,smooth(t))+sway,
      y:mix(release.y,hoverPoint.y,dropProgress(verticalTime,settings.catchBounce))};
  }
  function beamAt(progress){
    const t=clamp(progress);
    return {x:mix(rest.x,dome.x,t)+153*Math.sin(Math.PI*t)**1.35,
      y:mix(rest.y,dome.y,t)};
  }
  function sample(time){
    const t=Math.max(0,time);
    const effects=[];
    const mark=(point,variant,amount,afterglow=0,pulse=1)=>{
      if(amount>0||afterglow>0)effects.push({kind:'mark',point,variant,amount,afterglow,pulse,
        width:variant==='full'?domeWidth*settings.domeSize:46,
        light:variant==='full'?settings.domeLight:1});
    };
    const atShelf=(start,peak)=>{
      if(t>=start&&t<peak+.37){
        const amount=t<peak?smooth((t-start)/(peak-start)):1-smooth((t-peak)/.37);
        mark(shelf,'simple',amount);
      }
    };
    atShelf(.02,shelfPeak);
    atShelf(shelfReturnStart,returns);
    if(t>=domeStart&&t<appears+.16){
      const reveal=smooth((t-domeStart)/(domePeak-domeStart));
      const recede=smooth((t-domeRecedes)/(appears-domeRecedes));
      const afterglow=t<domeRecedes?0:.11*(1-smooth((t-appears)/.16));
      const flashFade=smooth((t-domePeak)/settings.domeHold);
      const intensity=1-settings.domePulse*flashFade;
      mark(dome,'full',reveal*(1-recede),afterglow,intensity);
    }
    if(t>=pickup&&t<bookAtDome){
      const launch=smooth((t-pickup)/(formsBeam-pickup));
      const travel=smooth((t-formsBeam)/settings.beamTime);
      const glow=launch*(1-smooth((t-beamEnds)/(bookAtDome-beamEnds)));
      effects.push({kind:'beam',at:beamAt,progress:travel,glow,width:settings.beamWidth});
    }
    if(t>=morphToMark&&t<shelfReturnStart){
      const elapsed=clamp((t-morphToMark)/(returnPeak-morphToMark));
      const vanish=smooth((t-returnPeak)/(shelfReturnStart-returnPeak));
      mark(dome,'full',smooth(elapsed)*(1-vanish));
    }
    if(t<shelfPeak)return {phase:t===0?'原位':'书架上的个人标识',inShelf:true,effects};
    if(t<appears)return {phase:t<domeStart?'瞬移到穹顶':t<domeRecedes?'穹顶标识亮起':'穹顶标识收拢',effects};
    if(t<reached){
      const tFall=(t-appears)/settings.fallTime;
      const bodyTime=reboundTime(tFall,settings.reboundSpeed);
      const settle=smooth((bodyTime-.67)/.33);
      const ripple=Math.sin(tFall*12)*Math.sin(Math.PI*tFall)*(1-settle);
      const catchAge=Math.max(0,bodyTime-catchStart);
      const impactGain=mix(1,settings.catchBounce,.42);
      const recoil=impactGain*Math.sin(catchAge*23)*Math.exp(-15*catchAge)*(1-smooth((bodyTime-.93)/.07));
      const pose={...fallingAt(tFall),exposed:book.length,
        heading:mix(radians(23),hoverShape.heading,settle),
        pitch:mix(radians(-22),hoverShape.pitch,settle)+radians(4*ripple+21*recoil),
        lean:mix(radians(-15),hoverShape.lean,settle)+radians(5*ripple-10*recoil),
        scale:hoverShape.scale*mix(.88,1,smooth(tFall))};
      const fan=smooth((catchAge-.02)/.045)*(1-smooth((catchAge-.085)/.15));
      const pageGain=smooth(tFall/.12)*(1-settle)+.55*fan*impactGain;
      return {phase:tFall<catchStart?'自由下落':'魔法托住书本',pose,opening:0,
        opacity:smooth((t-appears)/.085),flutter:{time:t-appears,amount:pageGain*settings.flutter},
        effects,effectsBehindBook:true};
    }
    if(t<pickup){
      const state=reading.sample(t);
      if(t<reading.flips){
        const floatTime=Math.min(.48,reading.flips-reached);
        const lift=Math.sin(Math.PI*smooth((t-reached)/floatTime));
        state.pose.y-=4.5*lift;
        state.pose.x+=1.7*lift;
        state.pose.lean+=radians(1.4*lift);
      }
      return {...state,effects};
    }
    if(t<formsBeam)return {phase:'合书后化为光束',pose:rest,opening:0,
      opacity:1-smooth((t-pickup)/(formsBeam-pickup)),effects};
    if(t<beamEnds)return {phase:'光束返回穹顶',effects};
    if(t<returnPeak){
      const inLight=smooth((t-beamEnds)/(bookAtDome-beamEnds));
      const toMark=smooth((t-morphToMark)/(returnPeak-morphToMark));
      return {phase:t<morphToMark?'穹顶处重新现身':'书化为个人标识',pose:returnPose,
        opening:0,opacity:inLight*(1-toMark),effects};
    }
    if(t<returns)return {phase:t<shelfReturnStart?'穹顶标识亮起':'瞬移回原书位',effects};
    return {phase:'归位',inShelf:true,effects};
  }
  return {...reading,book,sample,finish,paths:{descend},fallingAt,beamAt,shelf,dome,
    shelfPeak,domePeak,domeRecedes,appears,caught,formsBeam,beamEnds,bookAtDome,returnPeak,returns};
}

function drawMark(ctx,mark,art){
  const {point,amount,afterglow,width}=mark;
  const light=mark.light*mark.pulse;
  const {image,source,ratio}=art;
  const size=width*(.88+.12*amount);
  const glowRadius=width*.60;
  ctx.save();
  ctx.translate(point.x,point.y);
  const halo=ctx.createRadialGradient(0,0,0,0,0,glowRadius);
  halo.addColorStop(0,'#fff6bdcc');
  halo.addColorStop(.38,'#f3ed8785');
  halo.addColorStop(1,'#f3ed8700');
  ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=clamp(Math.max(amount*light*.81,afterglow*light));
  ctx.fillStyle=halo;
  ctx.fillRect(-glowRadius,-glowRadius,glowRadius*2,glowRadius*2);
  if(amount>0){
    ctx.globalCompositeOperation='source-over';
    ctx.globalAlpha=clamp(amount*mix(1,mark.pulse,.30));
    ctx.shadowColor=identityColor;
    ctx.shadowBlur=width*.043*light;
    ctx.drawImage(image,...source,-size/2,-size*ratio/2,size,size*ratio);
    // The second pass brightens the reflection inside the original silhouette.
    ctx.globalCompositeOperation='screen';
    ctx.shadowBlur=0;
    ctx.globalAlpha=clamp(amount*light*.57);
    ctx.drawImage(image,...source,-size/2,-size*ratio/2,size,size*ratio);
  }
  ctx.restore();
}

function drawBeam(ctx,{at,progress,glow,width}){
  if(glow<=0)return;
  const head=at(progress);
  ctx.save();
  ctx.globalCompositeOperation='screen';
  ctx.lineCap='round';
  if(progress>0){
    const tail=Math.max(0,progress-.37);
    const count=24;
    for(let i=0;i<count;i++){
      const amount=(i+1)/count;
      const a=at(mix(tail,progress,i/count));
      const b=at(mix(tail,progress,amount));
      ctx.beginPath();
      ctx.moveTo(a.x,a.y);
      ctx.lineTo(b.x,b.y);
      ctx.strokeStyle=identityColor;
      ctx.globalAlpha=glow*amount*.34;
      ctx.lineWidth=(9+14*amount)*width;
      ctx.stroke();
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle=identityColor;
      ctx.globalAlpha=glow*amount*.72;
      ctx.lineWidth=(2+6*amount)*width;
      ctx.stroke();
      ctx.globalCompositeOperation='screen';
      ctx.strokeStyle='#fffacc';
      ctx.globalAlpha=glow*amount*.75;
      ctx.lineWidth=(1+2.2*amount)*width;
      ctx.stroke();
    }
  }
  const radius=27*width;
  const flare=ctx.createRadialGradient(head.x,head.y,0,head.x,head.y,radius);
  flare.addColorStop(0,'#ffffe7');
  flare.addColorStop(.13,identityColor);
  flare.addColorStop(.54,'#f3ed8766');
  flare.addColorStop(1,'#f3ed8700');
  ctx.globalAlpha=glow;
  ctx.fillStyle=flare;
  ctx.fillRect(head.x-radius,head.y-radius,radius*2,radius*2);
  ctx.restore();
}

export function drawArchiveEffects(ctx,effects,marks){
  for(const effect of effects){
    if(effect.kind==='mark')drawMark(ctx,effect,marks[effect.variant]);
    else drawBeam(ctx,effect);
  }
}

export function drawFallingLeaves(ctx,book,pose,{time,amount}){
  if(amount<=0)return;
  const project=projectBody(book,pose);
  const h=book.height;
  for(let i=0;i<4;i++){
    const flap=(.75+.25*Math.sin(time*27-i*.9))*amount;
    const lift=(1.1+i*.86)*flap;
    const edge=book.length-.5+i*.25;
    const a=project(edge,-book.thickness*.21,h-.84);
    const b=project(edge+lift*.85,-book.thickness*.24-i*.36,h+.55+lift);
    const c=project(edge+lift,-book.thickness*.20-i*.29,.72-lift*.25);
    const d=project(edge,-book.thickness*.17,.75);
    ctx.beginPath();
    ctx.moveTo(a.x,a.y);
    ctx.quadraticCurveTo(b.x+lift,b.y-2.3,b.x,b.y);
    ctx.quadraticCurveTo(b.x+lift*1.25,(b.y+c.y)/2-3,c.x,c.y);
    ctx.quadraticCurveTo(c.x-lift*2,c.y+.8,d.x,d.y);
    ctx.quadraticCurveTo(a.x-lift*.8,(a.y+d.y)/2,a.x,a.y);
    ctx.closePath();
    ctx.fillStyle=i%2?'#efe0ad':'#ba9360';
    ctx.fill();
    ctx.strokeStyle='#8b613f';
    ctx.lineWidth=.45;
    ctx.stroke();
  }
}
