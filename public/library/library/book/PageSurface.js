// UV origin: binding -> outer edge, top -> bottom. Left/right art is independent.
const mix=(a,b,t)=>a+(b-a)*t;
export function leafPoint(side,u,v){
 return {
  x:(side==='left'?83-u*(57+14*v):84+u*(50+17*v))-83,
  y:14+44*v-u*(side==='left'?9-v:9-2*v)-(8+4*v)*Math.sin(Math.PI*u)-35
 };
}

function triangle(c,img,src,dst){
 const [a,b,d]=src,[p,q,r]=dst;
 const det=(b.x-a.x)*(d.y-a.y)-(d.x-a.x)*(b.y-a.y);
 if(Math.abs(det)<1e-5)return;
 const A=((q.x-p.x)*(d.y-a.y)-(r.x-p.x)*(b.y-a.y))/det;
 const B=((q.y-p.y)*(d.y-a.y)-(r.y-p.y)*(b.y-a.y))/det;
 const C=((r.x-p.x)*(b.x-a.x)-(q.x-p.x)*(d.x-a.x))/det;
 const D=((r.y-p.y)*(b.x-a.x)-(q.y-p.y)*(d.x-a.x))/det;
 const cx=(p.x+q.x+r.x)/3,cy=(p.y+q.y+r.y)/3;
 c.save();c.beginPath();
 // A subpixel overlap prevents the antialias seams of adjacent triangles.
 for(const [j,z] of dst.entries()){
  const dx=z.x-cx,dy=z.y-cy,l=Math.hypot(dx,dy)||1,x=z.x+.13*dx/l,y=z.y+.13*dy/l;
  if(!j)c.moveTo(x,y);else c.lineTo(x,y);
 }
 c.closePath();c.clip();c.transform(A,B,C,D,p.x-A*a.x-C*a.y,p.y-B*a.x-D*a.y);c.drawImage(img,0,0);c.restore();
}

export function drawLeaf(c,img,point,variant=0){
 const columns=10,rows=5;
 // An opaque sheet under the texture prevents tiny triangle seams from showing
 // the scene or the printed page below through the moving paper.
 c.save();c.fillStyle='#f7e5c7';c.beginPath();
 const outline=[];
 for(let j=0;j<=20;j++)outline.push(point(j/20,0));
 for(let j=1;j<=20;j++)outline.push(point(1,j/20));
 for(let j=19;j>=0;j--)outline.push(point(j/20,1));
 for(let j=19;j>=0;j--)outline.push(point(0,j/20));
 outline.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.fill();c.restore();
 // Reflow within this side's own artwork; no page is copied from the other side.
 const inset=(variant%3)*.025;
 const uv=(u,v)=>({x:u*(img.width-1),y:(inset+v*(1-2*inset))*(img.height-1)});
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const u=col/columns,v=row/rows,U=(col+1)/columns,V=(row+1)/rows;
  const s=[uv(u,v),uv(U,v),uv(U,V),uv(u,V)],p=[point(u,v),point(U,v),point(U,V),point(u,V)];
  triangle(c,img,[s[0],s[1],s[2]],[p[0],p[1],p[2]]);
  triangle(c,img,[s[0],s[2],s[3]],[p[0],p[2],p[3]]);
 }
}

export function turnPoint(t,u,v){
 const right=leafPoint('right',u,v),left=leafPoint('left',u,v),angle=t*Math.PI;
 const radius=mix(right.x-1,-left.x,t);
 return {x:mix(1,0,t)+radius*Math.cos(angle)+3*Math.sin(Math.PI*u)*Math.sin(angle),
  y:mix(right.y,left.y,t)-23*u*Math.sin(angle)*(1-.12*v)};
}

export function drawSpread(c,images,index=0,leftIndex=index){
 c.drawImage(images.open,-83,-35,166,70);
 // Erase BOTH baked-in printed faces before drawing the independently textured
 // pages. Only the original cover and page-block thickness remain underneath.
 c.fillStyle='#f5dfbd';
 c.beginPath();c.moveTo(-71,17);c.lineTo(-60,-31);c.bezierCurveTo(-40,-39,-18,-32,0,-21);c.lineTo(1,24);c.bezierCurveTo(-15,7,-45,3,-71,17);c.fill();
 c.beginPath();c.moveTo(1,-21);c.bezierCurveTo(18,-32,40,-39,52,-32);c.lineTo(70,17);c.bezierCurveTo(46,3,16,9,1,24);c.fill();
 drawLeaf(c,images.leftPage,(u,v)=>leafPoint('left',u,v),leftIndex);
 drawLeaf(c,images.rightPage,(u,v)=>leafPoint('right',u,v),index);
}

export function drawTurn(c,images,t,index){
 const front=t<.5;
 drawLeaf(c,front?images.rightPage:images.leftPage,(u,v)=>turnPoint(t,u,v),front?index: index+1);
}
