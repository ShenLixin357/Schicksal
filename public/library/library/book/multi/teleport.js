import {defaultsFor} from './routes.js';
import {createReadingSequence} from './roundtrip.js';

const peak=.055, afterglow=.18;
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=value=>{const u=clamp(value);return u*u*(3-2*u);};

export function createTeleportTrip(book,input,timing){
  const settings={...defaultsFor(book.id),...input};
  const [x0,y0,x1,y1]=book.box;
  const shelf={x:(x0+x1)/2,y:(y0+y1)/2};
  const starts=.014;
  const leaves=starts+peak;
  const appears=leaves+settings.teleportDelay;
  const reading=createReadingSequence(book,settings,timing,appears);
  const {rest,hoverPoint,pickup,descend}=reading;
  const vanishes=pickup+peak;
  const returns=vanishes+settings.teleportDelay;
  // Keep the flash onset and both book swaps crisp. Only extend the decay.
  const brightFade=settings.flashDuration-peak;
  const fade=brightFade+afterglow;
  const finish=returns+fade;
  const pulses=[
    {point:shelf,swap:leaves,size:.57,arrival:false},
    {point:hoverPoint,swap:appears,size:1,arrival:true},
    {point:rest,swap:vanishes,size:.92,arrival:false},
    {point:shelf,swap:returns,size:.57,arrival:true}
  ];
  function sample(time){
    if(time>=finish)return {phase:'归位',inShelf:true};
    const flash=pulses.flatMap(({point,swap,size,arrival})=>{
      const age=time-swap;
      return age>=-peak&&age<fade?
        [{point,age,size,arrival,intensity:settings.flashIntensity,brightFade,fade}]:[];
    });
    if(time<leaves)return {phase:time<=starts?'原位':'书架闪光',inShelf:true,flash};
    if(time<appears)return {phase:'瞬移去程',inShelf:false,flash};
    if(time<pickup)return {...reading.sample(time),inShelf:false,flash};
    if(time<vanishes)return {phase:'书托闪光',inShelf:false,pose:rest,opening:0,flash};
    if(time<returns)return {phase:'瞬移回程',inShelf:false,flash};
    return {phase:'归位',inShelf:true,flash};
  }
  return {...reading,book,shelf,leaves,appears,vanishes,returns,finish,sample,paths:{descend}};
}

function fourPointStar(context,x,y,width,height){
  const innerX=width*.17,innerY=height*.15;
  context.beginPath();
  context.moveTo(x,y-height);
  context.bezierCurveTo(x+width*.06,y-innerY,x+innerX,y-innerY,x+width,y);
  context.bezierCurveTo(x+innerX,y+innerY,x+width*.06,y+innerY,x,y+height);
  context.bezierCurveTo(x-width*.06,y+innerY,x-innerX,y+innerY,x-width,y);
  context.bezierCurveTo(x-innerX,y-innerY,x-width*.06,y-innerY,x,y-height);
  context.closePath();
  context.fill();
}

const sparks=[
  [-.19,65,2.6,'#ffdd9f'],[.38,55,1.4,'#fff3cc'],
  [1.00,72,2.0,'#ffe4ae'],[1.56,52,1.5,'#e6d4ff'],
  [2.33,72,2.4,'#fff1c4'],[2.74,48,1.4,'#ffce83'],
  [3.17,61,1.8,'#fff7cb'],[3.65,69,2.4,'#ffe8ba'],
  [4.12,52,1.4,'#c8dcff'],[4.63,70,2.4,'#ffe5af'],
  [5.22,55,1.5,'#f0d6ff'],[5.72,61,2.1,'#fff2d2']
];

export function drawTeleportFlashes(context,flashes){
  for(const {point,age,size,arrival,intensity,brightFade,fade} of flashes){
    const tail=clamp(age/fade);
    const hot=age<0?smooth((age+peak)/peak):(1-clamp(age/brightFade))**2.25;
    const ring=smooth((age+.016)/.04)*(1-tail)**1.6;
    context.save();
    context.translate(point.x,point.y);
    context.scale(size,size);
    if(hot>0){
      const halo=context.createRadialGradient(0,0,0,0,0,79);
      halo.addColorStop(0,'#fffef1');
      halo.addColorStop(.22,'#fff2c6');
      halo.addColorStop(.52,'#ffc26b95');
      halo.addColorStop(1,'#ffba6a00');
      context.globalAlpha=clamp(hot*intensity*.92);
      context.fillStyle=halo;
      context.fillRect(-79,-79,158,158);
      const tilt=arrival ? .07 : -.07;
      context.rotate(tilt);
      context.globalAlpha=clamp(hot*intensity);
      const rays=context.createRadialGradient(0,0,4,0,0,83);
      rays.addColorStop(0,'#fffffc');
      rays.addColorStop(.46,'#fff4d0');
      rays.addColorStop(1,'#ffe4a890');
      context.fillStyle=rays;
      fourPointStar(context,0,0,15+28*hot,30+51*hot);
      context.globalAlpha=clamp(hot*intensity*.88);
      context.fillStyle='#fff3cc';
      fourPointStar(context,39,-36,4+5*hot,8+9*hot);
      fourPointStar(context,-32,24,3+3*hot,6+6*hot);
      context.rotate(-tilt);
    }
    if(ring>0){
      const travel=1-(1-tail)**2;
      const radius=9+59*travel;
      context.globalAlpha=clamp(ring*intensity*.76);
      context.strokeStyle='#ffe1a3';
      context.lineWidth=1+1.7*(1-tail);
      context.beginPath();
      context.ellipse(0,0,radius,radius*.63,arrival?-.29:.26,0,Math.PI*2);
      context.stroke();
      for(const [angle,distance,width,color] of sparks){
        const radius=10+distance*travel;
        const a=angle+(arrival ? .22 : 0);
        context.fillStyle=color;
        fourPointStar(context,Math.cos(a)*radius,Math.sin(a)*radius+8*tail,width,width*2.6);
      }
    }
    context.restore();
  }
}
