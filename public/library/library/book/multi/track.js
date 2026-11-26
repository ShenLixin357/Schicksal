import {CoreEffect,coreEffect,drawCoreSprite} from '../../ladder/CoreEffect.js';
import {routeBook,commonFields,aFields,teleportFields,archiveFields,defaultsFor,finalizedBookIds,returnBufferField,podium} from './routes.js';
import {drawContactShadow} from './rigid-book.js';
import {createRoundTrip} from './roundtrip.js';
import {createTeleportTrip,drawTeleportFlashes} from './teleport.js';
import {createArchiveTrip,drawArchiveEffects,drawFallingLeaves,loadArchiveMarks} from './archive-flight.js';
import {createReadingRenderer} from './reading.js';
export function multiTrack(book,input,ctx){
  const {scene,actorContext,flightOccluders,shelfOccluders,standMasks}=ctx;
  const teleport=book.route.kind==='teleport';
  const archive=book.route.kind==='archive';
  const createTrip=archive?createArchiveTrip:teleport?createTeleportTrip:createRoundTrip;
  const trip=createTrip(book,input,scene.book.speed.times);
  const drawReading=createReadingRenderer(actorContext,trip,scene.book);
  const {out,returning,descend}=trip.paths;
  const foreground=flightOccluders[book.id],shelfOccluder=shelfOccluders[book.id];
  function draw(state,elapsed){
    drawContactShadow(actorContext,book,state.contactShadow??0);
    const {pose}=state,distance=Math.max(0,podium.y-trip.readingLayout.supportBottom(book,pose,state.opening));
    if(pose.x>720&&pose.x<950&&distance<98){
      const radius=state.opening>0?45:33;
      actorContext.save();
      actorContext.translate(pose.x,podium.y+2);
      actorContext.scale(1+distance/140,.14);
      const shade=actorContext.createRadialGradient(0,0,2,0,0,radius);
      shade.addColorStop(0,`rgba(38,21,27,${.29*(1-distance/98)**1.5})`);
      shade.addColorStop(1,'rgba(38,21,27,0)');
      actorContext.fillStyle=shade;
      actorContext.fillRect(-radius,-radius,2*radius,2*radius);
      actorContext.restore();
    }
    actorContext.save();
    actorContext.globalAlpha=state.opacity??1;
    drawReading(state);
    if(state.flutter)drawFallingLeaves(actorContext,book,pose,state.flutter);
    actorContext.restore();
    const mask=state.inFlight?foreground:null;
    const inSlot=state.returningToShelf&&!state.inFlight&&pose.exposed<book.length;
    const shelfMask=inSlot?shelfOccluder:null;
    let supportMask;
    if(state.inFlight){
      if(book.id==='R4')supportMask=state.returningToShelf?standMasks.front:standMasks.approaching;
      if(book.id==='R3'&&state.returningToShelf)supportMask=standMasks.approaching;
    }
    if(state.behindCrest||mask||shelfMask||supportMask){
      actorContext.save();
      actorContext.globalCompositeOperation='destination-out';
      if(state.behindCrest)drawCoreSprite(actorContext,scene.coreImages.sprite,elapsed);
      if(mask)for(const {image,x,y} of mask)actorContext.drawImage(image,x,y);
      if(shelfMask)actorContext.drawImage(shelfMask.image,shelfMask.x,shelfMask.y);
      if(supportMask)actorContext.drawImage(supportMask.image,supportMask.x,supportMask.y);
      actorContext.restore();
    }
  }
  const [x0,y0,x1,y1]=book.box;
  const shelf={x:(x0+x1)/2,y:(y0+y1)/2};
  const drop={at:f=>descend.at(f*descend.duration),color:'drop'};
  if(archive)return {
    finish:trip.finish,settled:trip.settled,closes:trip.closes,sample:trip.sample,draw,
    chapters:[['书架标识',trip.shelfPeak],['穹顶标识',trip.domePeak],
      ['标识收拢',(trip.domeRecedes+trip.appears)/2],
      ['自由下落',trip.appears+(trip.reached-trip.appears)*.48],['接住与回弹',trip.caught],['悬停',trip.reached],
      ['翻页',trip.flips],['落稳',trip.lands],['光束',trip.formsBeam+(trip.beamEnds-trip.formsBeam)*.46],
      ['穹顶现身',trip.bookAtDome],['回程标识',trip.returnPeak],['归位',trip.returns]],
    curves:[{at:trip.fallingAt,color:'out'},{at:trip.beamAt,color:'back'},drop],
    marks:[{...shelf,name:'原书位',time:trip.shelfPeak},
      {...trip.dome,name:'穹顶标识',time:trip.domePeak},
      {...trip.hoverPoint,name:'悬停',time:trip.reached},{...podium,name:'书托',time:trip.lands}]
  };
  if(teleport)return {
    finish:trip.finish,settled:trip.settled,closes:trip.closes,sample:trip.sample,draw,
    chapters:[['消失',trip.leaves],['现身',trip.appears],['翻页',trip.flips],
      ['落稳',trip.lands],['回程',trip.vanishes],['归位',trip.returns]],
    curves:[drop],
    marks:[
      {...shelf,name:'原书位',time:trip.leaves},
      {...trip.hoverPoint,name:'悬停',time:trip.appears},
      {...podium,name:'书托',time:trip.lands}
    ]
  };
  const center=t=>trip.sample(t).pose??shelf;
  return {
    finish:trip.finish,settled:trip.settled,closes:trip.closes,sample:trip.sample,draw,
    chapters:[['离架',trip.depart],...(out.loopEnd?[['出环',trip.depart+out.loopEnd]]:[]),
      ['悬停',trip.reached],['翻页',trip.flips],
      ['落稳',trip.lands],['回程',trip.pickup]],
    curves:[
      {at:f=>center(f*trip.depart),color:'out',arrows:false},
      {at:f=>out.at(f*out.duration),color:'out',under:f=>trip.sample(trip.depart+f*out.duration).behindCrest},
      {at:f=>returning.at(f*returning.duration),color:'back'},
      {at:f=>center(trip.alignTime+f*(trip.finish-trip.alignTime)),color:'back',arrows:false},
      drop
    ],
    marks:[
      {...shelf,name:'原书位',time:0},
      {...out.at(0),name:'离架',time:trip.depart},
      {x:trip.hoverPoint.x,y:trip.hoverPoint.y,name:'悬停',time:trip.reached},
      {...podium,name:'书托',time:trip.lands}
    ]
  };
}

