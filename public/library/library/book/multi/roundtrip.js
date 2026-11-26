import {extractionPose,shelfPose,projectBody} from './rigid-book.js';
import {createReadingLayout} from './reading.js';
import {defaultsFor,hovering,podium} from './routes.js';
import {createBookPath} from '../BookPath.js';
import {blueBookV5} from '../book-appearance.js';

export {hovering,podium};

const rad=degrees=>degrees*Math.PI/180;
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a+(b-a)*t;
const ease=value=>{const t=clamp(value);return t*t*t*(10+t*(-15+6*t));};
const v=(x,y)=>({x,y});

function node(t,x,y,dx=0,dy=0){return {t,x,y,dx,dy};}
function hermite(a,b,t) {
  const span=b.t-a.t,u=clamp((t-a.t)/span),u2=u*u,u3=u2*u;
  const p=2*u3-3*u2+1,q=u3-2*u2+u,r=-2*u3+3*u2,s=u3-u2;
  return v(p*a.x+q*a.dx*span+r*b.x+s*b.dx*span,p*a.y+q*a.dy*span+r*b.y+s*b.dy*span);
}
function path(nodes) {
  const duration=nodes.at(-1).t;
  function at(time){
    const t=Math.max(0,Math.min(duration,time));
    const i=nodes.findIndex((n,i)=>i>0&&t<=n.t);
    return hermite(nodes[i-1],nodes[i],t);
  }
  function velocity(time) {
    const a=at(time-.012),b=at(time+.012);
    return v((b.x-a.x)/.024,(b.y-a.y)/.024);
  }
  return {duration,at,velocity};
}
// The routes use scene pixels. Time advances by traveled distance; camera
// distance is calibrated separately to the shelf, crest and stand.
function cubic(point, segment, t) {
  const u=1-t;
  return v(
    u*u*u*point.x+3*u*u*t*segment[0]+3*u*t*t*segment[2]+t*t*t*segment[4],
    u*u*u*point.y+3*u*u*t*segment[1]+3*u*t*t*segment[3]+t*t*t*segment[5]
  );
}
function flightPath(start, segments, geometry, timingFor) {
  const samples=[{point:start,distance:0}], marks=[];
  for(const [index,segment] of segments.entries()) {
    const first=index===0?start:v(...segments[index-1].slice(-2));
    for(let i=1;i<=216;i++) {
      const previous=samples.at(-1),point=cubic(first,segment,i/216);
      const phase=(index+i/216)/segments.length;
      const envelope=Math.sin(Math.PI*phase)**2;
      const baseline=mix(start.y,geometry.hover.y,phase);
      const shift=envelope*((point.y-baseline)*(geometry.shape-1)-geometry.height);
      const headroom=Math.max(0,point.y-43);
      point.y+=shift>=0?shift:-headroom*(-Math.expm1(shift/(headroom||1)));
      samples.push({point,distance:previous.distance+Math.hypot(
        point.x-previous.point.x,point.y-previous.point.y
      )});
    }
    marks.push(samples.at(-1).distance);
  }
  const length=samples.at(-1).distance;
  const {duration,progress,loopStart,loopEnd}=timingFor(marks,length);
  function at(t){
    const distance=progress(t)*length;
    let lo=0,hi=samples.length-1;
    while(hi-lo>1){
      const mid=(lo+hi)>>1;
      if(samples[mid].distance<distance)lo=mid;
      else hi=mid;
    }
    const before=samples[lo],after=samples[hi];
    const f=(distance-before.distance)/(after.distance-before.distance);
    return v(mix(before.point.x,after.point.x,f),mix(before.point.y,after.point.y,f));
  }
  function velocity(t){
    const a=at(t-.008),b=at(t+.008),span=Math.min(t+.008,duration)-Math.max(t-.008,0);
    return v((b.x-a.x)/span,(b.y-a.y)/span);
  }
  return {duration,marks:marks.map(mark=>mark/length),progress,at,velocity,loopStart,loopEnd};
}
function pacedFlight(length,duration,pace,entrySpeed) {
  const timing=path([node(0,0,0,entrySpeed*duration/length,0),...pace,node(1,1,0)]);
  return {duration,progress:t=>clamp(timing.at(t/duration).x)};
}

// Integrate monotone velocity blends independently of the spatial path.
// Joining the blends by endpoint velocity avoids an acceleration spike at exit.
function velocityBlend(distance,start,end,power=1){
  const samples=160,integral=[0];
  let previous=start;
  for(let i=1;i<=samples;i++){
    const u=i/samples,smooth=u*u*(3-2*u);
    const current=mix(start,end,smooth**power);
    integral.push(integral.at(-1)+(current+previous)/(2*samples));
    previous=current;
  }
  const average=integral.at(-1),duration=distance/average;
  function at(time){
    const step=clamp(time/duration)*samples;
    const i=Math.min(samples-1,Math.floor(step));
    return distance*mix(integral[i],integral[i+1],step-i)/average;
  }
  return {duration,at};
}
function aFlight(marks,length,entrySpeed,depart,settings){
  const approachStart=marks.at(-2),loopDistance=approachStart-marks[0];
  const budget=Math.max(1.4,settings.total-depart-settings.reading-settings.descent);
  const cruise=Math.max(105,(marks[0]+loopDistance*.74)/budget*1.55);
  const exit=cruise*settings.exitSpeed;
  const inner=Math.min(cruise,exit)*settings.loopSpeed;
  const stages=[
    velocityBlend(marks[0],entrySpeed,cruise,1/settings.acceleration),
    velocityBlend(loopDistance/2,cruise,inner),
    velocityBlend(loopDistance/2,inner,exit),
    velocityBlend(length-approachStart,exit,0,1+1.25/settings.deceleration)
  ];
  const loopStart=stages[0].duration;
  const loopEnd=stages.slice(0,3).reduce((time,stage)=>time+stage.duration,0);
  const duration=loopEnd+stages[3].duration;
  function progress(time){
    let covered=0;
    for(const stage of stages){
      if(time<=stage.duration)return covered/length+stage.at(time)/length;
      covered+=stage.at(stage.duration);
      time-=stage.duration;
    }
    return 1;
  }
  return {duration,loopStart,loopEnd,progress};
}

function cameraTrack(keys, initialRate=0){
  const slopes=keys.slice(1).map(([t,d],i)=>(d-keys[i][1])/(t-keys[i][0]));
  const smooth=path(keys.map(([t,d],i)=>{
    if(i===0){
      const secant=slopes[0];
      const tangent=Math.sign(secant)*Math.max(0,Math.min(2.8*Math.abs(secant),initialRate*Math.sign(secant)));
      return node(t,d,0,tangent);
    }
    if(i===keys.length-1)return node(t,d,0);
    const earlier=slopes[i-1],later=slopes[i];
    const derivative=earlier*later>0?2/(1/earlier+1/later):0;
    return node(t,d,0,derivative);
  }));
  return t=>smooth.at(t).x;
}
const crestLane=128;

function observedDeparture(book,t) {return shelfPose(book,extractionPose(book,t));}
function onShelf(book,distance) {
  return shelfPose(book,{
    heading:rad(book.startAngle),pitch:0,lean:0,scale:1,drift:0,lift:0,
    pull:distance*book.length,exposed:clamp(distance)*book.length
  });
}
function shape(a,b,weight) {
  return Object.fromEntries(['heading','pitch','lean','scale'].map(name=>[name,mix(a[name],b[name],weight)]));
}
function slope(vel) {
  return Math.atan2(vel.y,Math.max(70,Math.abs(vel.x)));
}
function fitOnPodium(book,orientation,reading,opening=0) {
  const local={...orientation,x:0,y:0};
  return {...orientation,x:podium.x,
    y:podium.y-reading.supportBottom(book,local,opening),exposed:book.length};
}
function insertAt(book,progress){
  // The cubic covers the last book width and matches the approach speed at u=0.
  const u=clamp(progress),u2=u*u,u3=u2*u;
  const distance=1.125*(2*u3-3*u2+1)-.63*(u3-2*u2+u);
  return onShelf(book,distance);
}

function routeSegments(source,start) {
  const segments=source.map(segment=>segment.slice());
  const initialLength=Math.hypot(start.dx,start.dy);
  const limit=start.dy<0?(start.y-23)/-start.dy:Infinity;
  const factor=Math.min(1.3,limit,82/Math.max(1,initialLength));
  segments[0][0]=start.x+start.dx*factor;
  segments[0][1]=start.y+start.dy*factor;
  for(let i=1;i<segments.length;i++){
    const previous=segments[i-1],current=segments[i];
    const [px,py]=previous.slice(-2);
    const dx=px-previous[2],dy=py-previous[3];
    const length=Math.hypot(current[0]-px,current[1]-py);
    const prevLength=Math.hypot(dx,dy);
    if(prevLength>0){
      current[0]=px+dx*length/prevLength;
      current[1]=py+dy*length/prevLength;
    }
  }
  return segments;
}

export function createReadingSequence(book,settings,timing,reached) {
  const original=book.id==='A';
  const hoverPoint=original?blueBookV5.hover:hovering;
  const left=book.shelfSide==='left',sign=left?1:-1;
  const approachShape={x:0,y:0,heading:rad(left?13:9),pitch:rad(-13),lean:rad(left?-5:5),scale:1};
  const unit=projectBody(book,approachShape);
  const a=unit(0,0,0),b=unit(0,0,book.height);
  const hoverScale=66.5/Math.hypot(a.x-b.x,a.y-b.y);
  const readingLayout=createReadingLayout(hoverScale,podium.y);
  const hoverShape={heading:rad(left?13:9),pitch:rad(-13),lean:rad(left?-5:5),scale:hoverScale};
  const contactShape={heading:rad(left?11:8),pitch:rad(-18),lean:rad(sign*6.4),scale:readingLayout.standScale};
  const restShape={...contactShape,lean:rad(sign*1.8),pitch:rad(-20)};
  const rest=fitOnPodium(book,restShape,readingLayout);
  const openShape={...hoverShape,heading:rad(left?8:5),pitch:rad(34),lean:rad(left?-3:3)};
  const openContactShape={...contactShape,heading:openShape.heading,pitch:rad(39),lean:rad(sign*1.2)};
  const openRestShape={...openContactShape,lean:0,pitch:rad(37)};
  const contact=fitOnPodium(book,openContactShape,readingLayout,1);
  const openRest=fitOnPodium(book,openRestShape,readingLayout,1);

  const readingRate=original?settings.reading/(timing.hovering+timing.opening+timing.flipping):settings.reading;
  const hoverDuration=timing.hovering*readingRate;
  const openingDuration=timing.opening*readingRate;
  const flipDuration=timing.flipping*readingRate;
  const afterFlipPause=.20,loweringTime=settings.descent,settlingTime=.25,restDuration=.75,closingTime=.67;
  const opens=reached+hoverDuration,flips=opens+openingDuration,pagesDone=flips+flipDuration;
  const endHover=pagesDone+afterFlipPause,lands=endHover+loweringTime,settled=lands+settlingTime;
  const closes=settled+restDuration,pickup=closes+closingTime;

  function hover(local,opening=0){
    const ramp=ease(local/.49)*(1-ease((local-(endHover-reached-.30))/.30));
    const a=local*(left?4.1:4.9);
    const stance=shape(hoverShape,openShape,opening);
    return {
      ...stance,
      x:hoverPoint.x+sign*ramp*2.4*Math.sin(a-.38),
      y:hoverPoint.y-ramp*(2.4*Math.sin(a)+.7*Math.sin(a*1.7)),
      heading:stance.heading+rad(ramp*1.7*Math.sin(a*.86)),
      pitch:stance.pitch+rad(ramp*1.4*Math.sin(a*.74)),
      lean:stance.lean+rad(ramp*2.0*Math.sin(a-.23)),
      exposed:book.length
    };
  }
  const hoverDurationTotal=endHover-reached;
  const hoverEnd=hover(hoverDurationTotal,1),hoverBefore=hover(hoverDurationTotal-.003,1);
  const descend=path([
    node(0,hoverEnd.x,hoverEnd.y,(hoverEnd.x-hoverBefore.x)/.003,(hoverEnd.y-hoverBefore.y)/.003),
    node(loweringTime*.68,podium.x+sign*1.3,mix(hoverEnd.y,contact.y,.80),-sign*7,90),
    node(loweringTime,contact.x,contact.y)
  ]);

  function sample(t){
    let phase,pose,opening=0,readingStage,readingProgress;
    if(t<opens){
      pose=hover(t-reached);phase='书托上方悬停';
    }else if(t<flips){
      readingStage='open';readingProgress=clamp((t-opens)/openingDuration);
      opening=ease(readingProgress);
      pose=hover(t-reached,opening);phase='空中展开';
    }else if(t<endHover){
      opening=1;
      pose=hover(t-reached,opening);
      readingStage=t<pagesDone?'flip':'spread';
      readingProgress=clamp((t-flips)/flipDuration);
      phase=t<pagesDone?'悬停翻页':'翻页完成';
    }else if(t<lands){
      opening=1;readingStage='spread';
      const delta=t-endHover, amount=ease(delta/loweringTime);
      pose={...descend.at(delta),...shape(hoverEnd,contact,amount),exposed:book.length};
      phase='翻完后下降';
    }else if(t<settled){
      opening=1;readingStage='spread';
      pose=fitOnPodium(book,shape(contact,openRest,ease((t-lands)/settlingTime)),readingLayout,opening);
      phase='落稳书托';
    }else if(t<closes){
      opening=1;readingStage='spread';pose=openRest;phase='书托上保持展开';
    }else{
      readingStage='close';readingProgress=1-clamp((t-closes)/closingTime);
      const closed=ease(1-readingProgress);
      opening=1-closed;
      pose=fitOnPodium(book,shape(openRest,rest,closed),readingLayout,opening);phase='在书托上合书';
    }
    return {phase,pose,opening,readingStage,readingProgress};
  }
  return {left,hoverPoint,hoverScale,hoverShape,readingLayout,rest,descend,
    reached,opens,flips,pagesDone,endHover,lands,settled,closes,pickup,sample};
}

export function createRoundTrip(book,input,timing) {
  const settings={...defaultsFor(book.id),...input};
  const original=book.id==='A';
  const hoverPoint=original?blueBookV5.hover:hovering;
  const left=book.shelfSide==='left',sign=left?1:-1;
  const baseDepart=left?1.10:1.02;
  const depart=original?settings.extract:baseDepart*settings.extract;
  const extractRate=baseDepart/depart;
  const from=observedDeparture(book,baseDepart),before=observedDeparture(book,baseDepart-.003);
  const after=observedDeparture(book,baseDepart+.003);
  const velocityTime=.006/extractRate;
  const atStart=node(0,from.x,from.y,(after.x-before.x)/velocityTime,(after.y-before.y)/velocityTime);
  const entrySpeed=Math.hypot(atStart.dx,atStart.dy);
  const source=original?createBookPath(blueBookV5,settings).outbound.slice(1)
    .flatMap(curve=>curve.segments.map(segment=>segment.slice(1).flatMap(({x,y})=>[x,y]))):
    book.route.segments;
  const duration=original?0:book.route.duration*settings.flight;
  const pace={
    H:[node(.33,.40,0,.84),node(.58,.66,0,1.46),node(.79,.91,0,.92)],
    K:[node(.48,.57,0,1.49),node(.74,.86,0,.83)],
    I:[node(.46,.59,0,1.30),node(.76,.87,0,1.01)],
    C:[node(.27,.30,0,1.27),node(.65,.70,0,1.16)],
    L:[node(.36,.33,0,1.39),node(.74,.86,0,.86)]
  };
  const out=flightPath(atStart,routeSegments(source,atStart),
    {...settings,hover:hoverPoint},(marks,length)=>original?aFlight(marks,length,entrySpeed,depart,settings):
      pacedFlight(length,duration,pace[book.route.route]??[node(.45,.45,0,1.53)],entrySpeed));
  const reading=createReadingSequence(book,settings,timing,depart+out.duration);
  const {hoverShape,hoverScale,readingLayout,rest,descend,
    reached,opens,flips,pagesDone,endHover,lands,settled,closes,pickup}=reading;
  const scaleRate=(after.scale-before.scale)/velocityTime;
  const progressRate=(out.progress(.001)-out.progress(0))/.001;
  const startDistance=1/from.scale;
  const {crest,crestPass}=book.route;
  const near=book.height<22?hoverScale*.72:1.72;
  const cameraKeys=crest?[
    [0,startDistance],...(book.id==='R2'?[[out.marks[0],.928],[out.marks[1],.865]]:[]),
    [out.marks[crest[0]],.837],
    [out.marks[crest[1]],.671],[1,1/near]
  ]:[
    [0,startDistance],[.38,mix(startDistance,1/near,.35)],
    [.72,mix(startDistance,1/near,.73)],[1,1/near]
  ];
  const outgoingDistance=cameraTrack(cameraKeys,
    -scaleRate/(from.scale*from.scale*progressRate));
  const align=onShelf(book,1.125);
  const insertionBase=left?.78:.71;
  const insertionTime=insertionBase/settings.returnSpeed;
  const direction=rad(book.startAngle);
  const intoShelf=book.length*.63/insertionBase;
  const dx=intoShelf*Math.cos(direction),dy=-intoShelf*book.shelfTilt*Math.sin(direction);
  const towardsShelf=Math.sign(book.x-podium.x);
  const clearance=Math.max(125,Math.abs(book.x-podium.x)*.62);
  const shelfHeight=Math.max(63,Math.min(book.y-48,book.height<22?340:390));
  // L3 leaves the stand below the crest and only climbs after the left edge.
  const returnWaypoints=book.id==='L3'?[
    node(.78,700,rest.y-11,-230,-55),
    node(1.65,580,455,-105,-87)
  ]:crestPass?crestPass.returnWaypoints.map(waypoint=>node(...waypoint)):[
    node(.66,rest.x+towardsShelf*clearance*.27,rest.y-119,towardsShelf*150,-210),
    node(1.52,mix(rest.x,align.x,.62),shelfHeight,towardsShelf*clearance*.82,
      (align.y-shelfHeight)*.30)
  ];
  const returning=path([node(0,rest.x,rest.y),...returnWaypoints,node(2.72,align.x,align.y,dx,dy)]);
  const startBuffer=settings.returnBuffer*settings.returnSpeed;
  function returnClock(elapsed){
    const local=elapsed*settings.returnSpeed;
    if(local>=startBuffer)return local-startBuffer/2;
    const u=local/startBuffer;
    return startBuffer*(u**3-.5*u**4);
  }
  const backDistance=cameraTrack([[0,1/rest.scale],[.39,left?.710:.735],[.76,.906],[1,1]]);
  const alignTime=pickup+(returning.duration+startBuffer/2)/settings.returnSpeed;
  const finish=alignTime+insertionTime;

  function fly(local){
    const pos=out.at(local),speed=out.velocity(local),steer=ease(local/.52);
    const inherited=observedDeparture(book,baseDepart+local*extractRate);
    const progress=out.progress(local);
    const localApproach=crest?out.marks[crest[1]]:.57;
    const towardReader=ease((progress-localApproach)/(1-localApproach));
    const depth=mix(outgoingDistance(progress),1/hoverScale,towardReader);
    // Projected size may be tuned while endpoints and crest layer ordering stay fixed.
    const envelope=Math.sin(Math.PI*progress)**2;
    const distance=depth*Math.exp((1-settings.depth)*.40*envelope);
    const drift=ease(local/.46)*(1-ease((local-(out.duration-.60))/.60));
    const orbitBank=crest?rad(sign*-11)*Math.sin(Math.PI*2*clamp((progress-.68)/.32)):0;
    const playful=book.route.route==='I'?rad(18)*Math.sin(Math.PI*clamp((progress-.76)/.24)):0;
    const bank=rad(sign*-10.1)+.24*slope(speed)+orbitBank;
    const nominal={
      heading:hoverShape.heading+drift*rad(sign*-10+6*Math.sin(progress*6.8)),
      pitch:hoverShape.pitch+drift*rad(-6+4*Math.sin(progress*7.6+1)),
      lean:hoverShape.lean+drift*settings.bank*(bank+playful+rad(3.8*Math.sin(progress*10.5))),
      scale:1/distance
    };
    return {...pos,...shape(inherited,nominal,steer),scale:nominal.scale,exposed:book.length};
  }
  function goBack(local){
    const pos=returning.at(local), speed=returning.velocity(local);
    const weight=ease(local/.56)*(1-ease((local-returning.duration+.57)/.57));
    const middle={
      heading:rad(left?27:-8),pitch:rad(-16),
      lean:rad(sign*14)+slope(speed)*.23,scale:hoverScale
    };
    const near=ease((local-returning.duration*.41)/(returning.duration*.59));
    return {
      ...pos,...shape(shape(rest,middle,weight),align,near),
      scale:1/backDistance(local/returning.duration),exposed:book.length
    };
  }

  function sample(time){
    const t=Math.max(0,time);
    let phase,pose,contactShadow=0,crestDepth=crestLane,opening=0,readingStage,readingProgress;
    let inFlight=false;
    if(t<=0 || t>=finish)return {phase:t<=0?'原位':'归位',inShelf:true};
    if(t<depart){
      const extracted=extractionPose(book,t*extractRate);
      pose=shelfPose(book,extracted);contactShadow=extracted.contact;phase='抽出书槽';
    }else if(t<reached){
      pose=fly(t-depart);
      inFlight=true;
      // Depth changes on the outside of the crest's full rotation envelope,
      // independently of the perspective/size slider.
      const approach=crestPass?.approach??crest;
      if(approach){
        const [before,after]=approach.map(index=>out.marks[index]);
        crestDepth=mix(-crestLane,crestLane,ease((out.progress(t-depart)-before)/(after-before)));
      }
      phase=original?
        (t<depart+out.loopStart?'起飞':t<depart+out.loopEnd?'近侧小回环':'出环后减速'):'去程';
    }else if(t<pickup){
      ({phase,pose,opening,readingStage,readingProgress}=reading.sample(t));
    }else if(t<alignTime){
      const local=returnClock(t-pickup);
      pose=goBack(local);phase='回程';
      inFlight=true;
      if(crestPass){
        const [before,after]=crestPass.departure;
        crestDepth=mix(crestLane,-crestLane,ease((local-before)/(after-before)));
      }
    }
    else{
      pose=insertAt(book,(t-alignTime)/insertionTime);phase='对准入架';
      contactShadow=.80*Math.sin(Math.PI*clamp(pose.exposed/book.length));
    }
    return {phase,pose,contactShadow,crestDepth,behindCrest:crestDepth<0,inFlight,returningToShelf:t>=pickup,
      opening,readingStage,readingProgress,inShelf:false};
  }

  return {book,left,depart,reached,opens,flips,pagesDone,endHover,lands,settled,closes,pickup,alignTime,finish,
    title:book.route.title,
    paths:{out,returning,descend},sample,rest,align,readingLayout,hoverPoint};
}
