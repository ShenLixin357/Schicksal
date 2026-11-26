const radians = degrees => degrees*Math.PI/180;
const clamp = value => Math.max(0,Math.min(1,value));
const smoother = value => {
  const t=clamp(value);
  return t*t*t*(10+t*(-15+6*t));
};
const mix=(a,b,t)=>a+(b-a)*t;
const clear=.60;

// These curves are measured in seconds. Distances along the shelf are in book
// widths; lift and drift are in scene pixels; all rotations are in degrees.
export const flightGestures={
  left:{
    pull:[[0,0,0],[.16,.063,.94],[.38,.45,1.86],[.60,1,2.60],
      [.84,1.57,1.63],[1.18,1.96,.74],[1.64,2.11,0]],
    yaw:[[.635,0,0],[.78,.15,1.8],[1.00,.68,2.65],[1.24,1.045,.18],
      [1.38,1.057,0],[1.72,1,0]],
    lift:[[clear,0,0],[.74,7.2,82],[.96,22.6,38],[1.13,25.1,0],
      [1.37,20,-15],[1.57,18.2,0],[1.94,21.1,0],[2.16,20.8,-2.5]],
    roll:[[clear,0,0],[.77,-16,-122],[.95,-25.5,0],[1.20,-10,87],
      [1.40,7,0],[1.65,-4,0],[1.96,-6.5,0]],
    pitch:[[clear,0,0],[.79,-13,-46],[.96,-17,0],[1.20,-7,51],
      [1.41,4,0],[1.67,-4.5,0],[1.95,-6,0]],
    drift:[[clear,0,0],[.83,1.1,13],[1.15,6.9,18],[1.53,10.5,4],[2.16,12,0]],
    closer:.061
  },
  right:{
    pull:[[0,0,0],[.14,.072,1],[.39,.55,2.06],[.60,1,2.03],
      [.84,1.38,1.15],[1.18,1.65,.50],[1.65,1.76,0]],
    yaw:[[.65,0,0],[.81,.24,2.35],[1.02,.82,1.95],[1.25,1.05,0],[1.62,1,0]],
    lift:[[clear,0,0],[.77,7.8,68],[.99,16.3,23],[1.14,17.8,0],
      [1.42,14.3,0],[1.82,16.4,0],[2.16,15.7,-2.1]],
    roll:[[clear,0,0],[.81,13,73],[.99,17,0],[1.24,6,-49],
      [1.41,-3.2,0],[1.65,4.5,0],[1.95,6.2,0]],
    pitch:[[clear,0,0],[.81,-10,-37],[.97,-12.5,0],[1.23,-6,34],
      [1.43,.95,0],[1.73,-4.4,0]],
    drift:[[clear,0,0],[.88,1,7],[1.22,3.15,5],[1.65,4.4,1.4],[2.16,5.05,0]],
    closer:.04
  }
};

// Hermite curves let the book carry its velocity and slope through the
// transition from a supported slide to a turn in the air.
function sample(curve,time) {
  if(time<=curve[0][0])return curve[0][1];
  for(let i=1;i<curve.length;i++){
    const [a,x,dx]=curve[i-1], [b,y,dy]=curve[i];
    if(time>b)continue;
    const span=b-a, t=(time-a)/span, q=t*t, r=q*t;
    return (2*r-3*q+1)*x+(r-2*q+t)*span*dx+(-2*r+3*q)*y+(r-q)*span*dy;
  }
  return curve.at(-1)[1];
}

export const extractionStages={half:.40,clear,lift:1.0,finished:2.05};

export function extractionPose(book,time) {
  const gesture=flightGestures[book.shelfSide];
  const travel=sample(gesture.pull,time);
  const released=smoother((time-clear)/.64);
  const inward=book.shelfSide==='left'?1:-1;
  return {
    pull:book.length*travel,
    exposed:book.length*Math.min(travel,1),
    lift:sample(gesture.lift,time),
    heading:radians(mix(book.startAngle,book.endAngle,sample(gesture.yaw,time))),
    lean:radians(sample(gesture.roll,time)),
    pitch:radians(sample(gesture.pitch,time)),
    drift:inward*sample(gesture.drift,time),
    scale:1+released*gesture.closer,
    contact:Math.sin(Math.PI*Math.pow(clamp(travel),.74)),
  };
}

function polygon(ctx,[first,...rest]) {
  ctx.beginPath();
  ctx.moveTo(first.x,first.y);
  for(const point of rest)ctx.lineTo(point.x,point.y);
  ctx.closePath();
}
function visible([a,b,,d]) {
  return (b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x)>1e-5;
}
function fillFace(ctx,quad,color) {
  polygon(ctx,quad);
  ctx.fillStyle=color;
  ctx.fill();
}
function drawSurface(ctx,quad,image,source=[0,0,image.width,image.height]) {
  const [left,top,w,h]=source, [a,b,,d]=quad;
  if(w<=0 || h<=0)return;
  const p=(b.x-a.x)/w,q=(b.y-a.y)/w,r=(d.x-a.x)/h,s=(d.y-a.y)/h;
  if(Math.abs(p*s-q*r)<1e-8)return;
  ctx.save();
  polygon(ctx,quad);
  ctx.clip();
  ctx.transform(p,q,r,s,a.x-p*left-r*top,a.y-q*left-s*top);
  ctx.drawImage(image,0,0);
  ctx.restore();
}

function tint(ctx,quad,warmth) {
  if(warmth>0.005)fillFace(ctx,quad,`rgba(255,198,139,${warmth})`);
  else if(warmth<-.005)fillFace(ctx,quad,`rgba(41,25,37,${-warmth})`);
}

export function drawShelfContact(ctx,book,time) {
  const {contact}=extractionPose(book,time);
  drawContactShadow(ctx,book,contact);
}

export function drawContactShadow(ctx,book,contact) {
  if(contact<.003)return;
  const {x,y,boardSlope}=book;
  ctx.save();
  ctx.translate(x,y+.85);
  ctx.transform(1,boardSlope,.37,1,0,0);
  ctx.scale(1,.48);
  const shade=ctx.createRadialGradient(0,.9,0,0,.9,7.2);
  shade.addColorStop(0,`rgba(34,15,18,${contact*.34})`);
  shade.addColorStop(.52,`rgba(46,22,24,${contact*.17})`);
  shade.addColorStop(1,'rgba(46,22,24,0)');
  ctx.fillStyle=shade;
  ctx.fillRect(-7.2,.10,14.4,5.4);
  ctx.restore();
}

// Exposed faces share a rigid transform and a single spine axis. No material
// switch is needed to go from back to front while rotating through edge-on.
export function shelfPose(book,pose) {
  const base=radians(book.startAngle);
  const onShelf={
    ...pose,
    x:book.x-pose.pull*Math.cos(base)+pose.drift,
    y:book.y-book.height*.5-pose.lift+book.shelfTilt*pose.pull*Math.sin(base),
  };
  const project=projectBody(book,{...onShelf,x:0,y:0},0);
  const center=project(book.length*.5,0,book.height*.5);
  return {...onShelf,x:onShelf.x+center.x,y:onShelf.y+center.y};
}

export function projectBody(book,pose,pivot=book.length*.5) {
  const c=Math.cos(pose.heading),s=Math.sin(pose.heading);
  const cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
  const cr=Math.cos(pose.lean),sr=Math.sin(pose.lean);
  return (u,w,h)=>{
    const x=(u-pivot)*c+w*s,z=-(u-pivot)*s+w*c,y=h-book.height*.5;
    const tippedY=y*cp-z*sp,tippedZ=z*cp+y*sp;
    const rotatedX=x*cr-tippedY*sr,rotatedY=x*sr+tippedY*cr;
    return {
      x:pose.x+rotatedX*pose.scale,
      y:pose.y+(-rotatedY+book.shelfTilt*tippedZ)*pose.scale,
    };
  };
}

export function drawRigidBook(ctx,book,time) {
  if(time>0)drawBookPose(ctx,book,shelfPose(book,extractionPose(book,time)));
}

export function drawBookPose(ctx,book,pose) {
  const H=book.height,v=book.thickness*.5,angle=pose.heading,s=Math.sin(angle);
  const project=projectBody(book,pose);
  const U=pose.exposed;
  const face=(u0,u1,w,h0,h1)=>[
    project(u0,w,h1),project(u1,w,h1),project(u1,w,h0),project(u0,w,h0)
  ];
  const side=(u,w0,w1,h0,h1)=>[
    project(u,w0,h1),project(u,w1,h1),project(u,w1,h0),project(u,w0,h0)
  ];
  const bottom=(a,b,w0,w1,h)=>[project(a,w0,h),project(b,w0,h),project(b,w1,h),project(a,w1,h)];

  if (U>0.008) {
    const underside=bottom(0,U,-v,v,0), head=bottom(U,0,-v,v,H);
    const inset=Math.min(.48,U*.19);
    if(visible(underside)){
      fillFace(ctx,underside,book.trim);
      drawSurface(ctx,bottom(inset,U,-v+.57,v-.57,.08),book.bottomPages,
        [0,0,book.bottomPages.width*(U-inset)/book.length,book.bottomPages.height]);
    }else if(visible(head)){
      fillFace(ctx,head,book.trim);
      drawSurface(ctx,bottom(U,inset,-v+.57,v-.57,H-.08),book.bottomPages,
        [0,0,book.bottomPages.width*(U-inset)/book.length,book.bottomPages.height]);
    }

    const front=visible(face(0,U,-v,0,H));
    const surface=front?book.front:book.back, w=front?-v:v;
    const panel=(a,b,y0,y1)=>front?face(a,b,w,y0,y1):face(b,a,w,y0,y1);
    const quad=panel(0,U,0,H);
    if(visible(quad)){
      const cropWidth=surface.width*U/book.length;
      const source=[front?0:surface.width-cropWidth,0,cropWidth,surface.height];
      drawSurface(ctx,quad,surface,source);
      // A restrained warm reflection that changes continuously with the book's angle.
      const incident=front?Math.cos(angle-.34):-Math.cos(angle-.34);
      const reflected=Math.max(0,Math.cos(angle-.52))*Math.max(0,Math.sin(-pose.pitch));
      tint(ctx,quad,.108*Math.max(0,incident)-.065+(front?.094*reflected:0));
      fillFace(ctx,panel(0,U,0,.57),book.trim);
      fillFace(ctx,panel(0,U,H-.33,H),book.trim);
      const shoulder=Math.min(U,1.17);
      fillFace(ctx,panel(0,shoulder,.37,H-.40),book.trim);
      if(U>1.2)fillFace(ctx,panel(.79,1.04,.65,H-.69),'rgba(221,178,129,.33)');
    }

    const fore=side(U,-v,v,0,H);
    if(U>=book.length-1e-5 && visible(fore)){
      fillFace(ctx,fore,book.trim);
      const edge=side(U,-v+.55,v-.55,.63,H-.54);
      drawSurface(ctx,edge,book.forePages);
      tint(ctx,edge,.025-s*.08);
    }
  }

  const binding=side(0,v,-v,0,H);
  if(visible(binding))drawSurface(ctx,binding,book.spine,book.spineCrop);
}
