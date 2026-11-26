import {BookEffect} from '../BookEffect.js';
import {smooth} from '../BookPath.js';
import {blueBookV5} from '../book-appearance.js';
import {drawBookPose,projectBody} from './rigid-book.js';

const createCanvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
const {hover:originalHover,stand:originalStand}=blueBookV5;
export const readingStand=originalStand;

export function createReadingLayout(hoverScale,podiumY) {
  const standScale=hoverScale*originalStand.openWidth/originalHover.openWidth;
  const standSupport=(podiumY-originalStand.y)/originalStand.openHeight;
  function dimensions(cameraScale){
    const progress=Math.max(0,Math.min(1,(cameraScale-hoverScale)/(standScale-hoverScale)));
    const mix=(near,landed)=>near+(landed-near)*progress;
    return {
      openWidth:mix(originalHover.openWidth,originalStand.openWidth),
      openHeight:mix(originalHover.openHeight,originalStand.openHeight)
    };
  }
  function supportBottom(book,pose,amount){
    const spread=pose.y+dimensions(pose.scale).openHeight*standSupport;
    if(amount>=1)return spread;
    const closed=Math.max(...silhouette(book,pose).map(p=>p.y));
    return closed+(spread-closed)*smooth(amount);
  }
  return {standScale,dimensions,supportBottom};
}

function silhouette(book,pose) {
  const project=projectBody(book,pose);
  const half=book.thickness/2;
  return [0,book.length].flatMap(u=>[-half,half].flatMap(w=>
    [0,book.height].map(h=>project(u,w,h))
  ));
}

// The original opening starts with a centered closed-book sprite. Render each
// flight model at that join so its material and silhouette carry through.
function closedSprite(book,pose) {
  const points=silhouette(book,pose);
  const width=2*Math.ceil(Math.max(...points.map(p=>Math.abs(p.x-pose.x)))+1);
  const height=2*Math.ceil(Math.max(...points.map(p=>Math.abs(p.y-pose.y)))+1);
  const resolution=3;
  const image=createCanvas(width*resolution,height*resolution),ctx=image.getContext('2d');
  ctx.scale(resolution,resolution);
  drawBookPose(ctx,book,{...pose,x:width/2,y:height/2});
  return {image,width,height};
}

function bindingTint(img,cover) {
  const surface=createCanvas(img.width,img.height),ctx=surface.getContext('2d');
  ctx.drawImage(img,0,0);
  const rgba=ctx.getImageData(0,0,img.width,img.height);
  for(let i=0;i<rgba.data.length;i+=4){
    const [r,g,b]=rgba.data.subarray(i,i+3);
    const blue=Math.max(0,Math.min(1,(b-Math.max(r,g)-5)/13));
    if(blue===0||rgba.data[i+3]===0)continue;
    const target=cover==='wine'?[b*.77+r*.29,g*.64,g*.67]:[b*.78,g*.70,b*.88];
    for(let channel=0;channel<3;channel++)rgba.data[i+channel]+=blue*(target[channel]-rgba.data[i+channel]);
  }
  ctx.putImageData(rgba,0,0);
  return surface;
}

export function createReadingRenderer(ctx,trip,original){
  const {book}=trip;
  const entering=closedSprite(book,trip.sample(trip.opens).pose);
  const leaving=closedSprite(book,trip.rest);
  const effect=new BookEffect(ctx,()=>{},original.appearance,original.settings);
  effect.images={
    ...original.images,
    cover:book.front,
    open:book.cover==='navy'?original.images.open:bindingTint(original.images.open,book.cover)
  };

  return (state)=>{
    const {pose,readingStage,readingProgress}=state;
    if(!readingStage){
      drawBookPose(ctx,book,pose);
      return;
    }
    const dimensions=trip.readingLayout.dimensions(pose.scale);
    const target={x:pose.x,y:pose.y,...dimensions};
    const closed=readingStage==='close'?leaving:entering;
    effect.images.closed=closed.image;
    effect.appearance={...original.appearance,hover:{
      ...target,closedWidth:closed.width,closedHeight:closed.height
    }};
    effect.pagesFinished=readingStage!=='open';

    if(readingStage==='open'||readingStage==='close'){
      effect.drawOpening(smooth(readingProgress),target);
    }else if(readingStage==='flip'){
      effect.drawPages(readingProgress);
    }else{
      effect.openAt(target.x,target.y,target.openWidth,target.openHeight,effect.turns);
    }
  };
}
