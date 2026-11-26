// Original handoff guide renderer; presentation only.
const paths={out:'#ffce82',back:'#cbb3ff',drop:'#a9eadb'};
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
function arrow(context,point,from,color){
  const angle=Math.atan2(point.y-from.y,point.x-from.x);
  context.save();
  context.translate(point.x,point.y);
  context.rotate(angle);
  context.fillStyle=color;
  context.beginPath();
  context.moveTo(11,0);context.lineTo(-8,-6);context.lineTo(-4,0);context.lineTo(-8,6);
  context.closePath();context.fill();
  context.restore();
}
export function buildGuides(guideLayer,track){
  const context=guideLayer.getContext('2d');
  const W=guideLayer.width,H=guideLayer.height;
  context.clearRect(0,0,W,H);
  context.save();
  context.lineWidth=3.5;
  context.lineCap='round';
  context.shadowColor='#201728';
  context.shadowBlur=4;
  for(const curve of track.curves){
    const color=paths[curve.color];
    context.strokeStyle=color;
    const count=180;
    for(let i=0;i<count;i++){
      const f=i/count,a=curve.at(f),b=curve.at((i+1)/count);
      const under=curve.under?.(f);
      if((curve.color==='back'||curve.color==='drop'||under)&&i%6>=3)continue;
      context.globalAlpha=under?.6:1;
      context.beginPath();
      context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
    }
    context.globalAlpha=1;
    if(curve.arrows===false)continue;
    for(const f of [.26,.59,.82]){
      if(curve.color==='drop'&&f!==.59)continue;
      arrow(context,curve.at(f),curve.at(f-.018),color);
    }
  }
  context.globalAlpha=1;
  context.font='20px sans-serif';
  for(const mark of track.marks){
    context.fillStyle='#fff2c6';
    context.beginPath();context.arc(mark.x,mark.y,5,0,Math.PI*2);context.fill();
    const text=`${mark.name} ${mark.time.toFixed(2)} s`;
    const w=context.measureText(text).width+14;
    const x=clamp(mark.x+10,6,W-w-6);
    const offsets={原书位:14,离架:-33,悬停:-38,书托:14,穹顶标识:-38};
    const y=clamp(mark.y+offsets[mark.name],7,H-27);
    context.fillStyle='#211925e8';context.fillRect(x,y,w,26);
    context.fillStyle='#fff2d9';context.fillText(text,x+7,y+20);
  }
  context.restore();
}
export function drawGuides(context,guideLayer,state){
  context.drawImage(guideLayer,0,0);
  if(!state.pose)return;
  const {x,y}=state.pose;
  context.save();
  context.strokeStyle='#fff1ce';context.lineWidth=2;
  context.beginPath();context.arc(x,y,10,0,Math.PI*2);context.stroke();
  context.restore();
}
