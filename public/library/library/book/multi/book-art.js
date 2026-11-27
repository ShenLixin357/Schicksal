import {blueBookV5} from '../book-appearance.js';
import {imageOf} from '../../ladder/LadderRenderer.js';
import {routeBook} from './routes.js';

const assetRoot=new URL('../../../assets/book/multi/',import.meta.url);
const createCanvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});

function leatherBack(colors) {
  const surface=createCanvas(256,192),c=surface.getContext('2d');
  const gradient=c.createLinearGradient(0,0,256,192);
  gradient.addColorStop(0,colors[0]);
  gradient.addColorStop(.62,colors[1]);
  gradient.addColorStop(1,colors[0]);
  c.fillStyle=gradient;c.fillRect(0,0,256,192);

  const raster=c.getImageData(0,0,256,192);
  for(let y=0;y<192;y++)for(let x=0;x<256;x++){
    const grain=2*Math.sin(x*1.3+y*.87)+1.4*Math.sin(y*2.3-x*.78);
    const at=(y*256+x)*4;
    for(let j=0;j<3;j++)raster.data[at+j]+=grain;
  }
  c.putImageData(raster,0,0);
  c.strokeStyle=colors[2];c.lineWidth=1.75;c.strokeRect(13,15,230,162);
  c.strokeStyle=colors[3];c.lineWidth=.75;c.strokeRect(18,19,220,153);
  c.fillStyle=colors[3];
  for(const x of [23,233])for(const y of [24,168]){
    c.beginPath();c.arc(x,y,1.7,0,Math.PI*2);c.fill();
  }
  return surface;
}

function pageSurface(horizontal) {
  const material=createCanvas(240,144),c=material.getContext('2d');
  const gradient=c.createLinearGradient(0,0,240,0);
  gradient.addColorStop(0,'#886746');
  gradient.addColorStop(.22,'#bc9e73');
  gradient.addColorStop(.74,'#aa895e');
  gradient.addColorStop(1,'#826647');
  c.fillStyle=gradient;c.fillRect(0,0,240,144);
  for(let i=2;i<(horizontal?144:240);i+=2){
    const opacity=.10+.045*Math.sin(i*1.66);
    c.fillStyle=i%8===0?'rgba(79,50,33,.22)':`rgba(246,213,164,${opacity})`;
    if(horizontal)c.fillRect(0,i,240,1);
    else c.fillRect(i,0,1,144);
  }
  return material;
}

function frontMaterial(texture) {
  const material=createCanvas(texture.width,texture.height),c=material.getContext('2d');
  c.drawImage(texture,0,0,texture.width*.943,texture.height,0,0,material.width,material.height);
  c.fillStyle='rgba(68,41,32,.11)';
  c.fillRect(0,0,material.width,material.height);
  return material;
}

const bottomPages=pageSurface(true),forePages=pageSurface(false);

const palette={
  navy:{trim:'#26344d',back:['#273653','#354664','#927759','#c5a76e']},
  plum:{trim:'#392d45',back:['#3c2d46','#56405e','#927759','#c5a76e']},
  wine:{trim:'#54332d',back:['#412a27','#644137','#8e6b4b','#ba966b']}
};
const shelfAngles={
  L1:[.40,.68],L2:[.42,.48],L3:[.27,.24],L4:[.32,.29],LT:[.42,.56],AVS:[.42,.59],
  R1:[.42,-.59],R2:[.43,-.37],R3:[.27,-.22],R4:[.31,-.29]
};
const sampleDimensions={
  L2:{x:54.45,y:348.85,height:35.05,thickness:8.6,length:26.5},
  R2:{x:1602.95,y:363.95,height:28.95,thickness:7.4,length:22}
};

export async function loadBooks(original){
  const response=await fetch(new URL('shelf/registry.json',assetRoot));
  if(!response.ok)throw new Error('无法加载书位坐标');
  const registry=await response.json();
  const images=Object.fromEntries(await Promise.all(Object.keys(palette).map(async name=>[
    name,frontMaterial(await imageOf(new URL(`cover-${name}.png`,assetRoot).href))
  ])));
  const {shelf}=blueBookV5;
  const {spine,cover,shelf:repair}=original.images;
  const a={
    id:'A',route:routeBook.A,shelfSide:'right',cover:'navy',
    x:shelf.x,y:shelf.y+24,height:48,length:34,thickness:11,shelfTilt:.43,boardSlope:-.37,
    startAngle:-48,endAngle:12,spine,repair,origin:[shelf.repairX,shelf.repairY],highlightOrigin:[1618,432],
    box:[shelf.hit.x1,shelf.hit.y1,shelf.hit.x2,shelf.hit.y2],spineCrop:[0,1,17,48],
    trim:palette.navy.trim,front:cover,back:leatherBack(palette.navy.back),bottomPages,forePages
  };
  const others=await Promise.all(Object.entries(routeBook).filter(([id])=>id!=='A').map(async ([id,route])=>{
    const info=registry.books[registry.labVariants?.[id]??id];
    const [x0,y0,x1,y1]=info.spineBounds,[shelfTilt,boardSlope]=shelfAngles[id];
    const shelfSide=route.shelfSide??(id.startsWith('L')?'left':'right');
    const left=shelfSide==='left';
    const height=(y1-y0)*.91;
    const dimensions=sampleDimensions[id]??{
      x:(x0+x1)/2,y:y1-1.1,height,length:height*.76,thickness:height*.22
    };
    const [spine,repair]=await Promise.all([info.spine,info.repair].map(
      src=>imageOf(new URL('shelf/'+src,assetRoot).href)
    ));
    const {trim,back}=palette[route.cover];
    const front=route.coverAsset?
      frontMaterial(await imageOf(new URL(route.coverAsset,assetRoot).href)):images[route.cover];
    return [id,{id,route,shelfSide,...dimensions,cover:route.cover,shelfTilt,boardSlope,
      startAngle:left?-132:-48,endAngle:left?15:12,
      spine,repair,origin:info.origin,box:info.spineBounds,trim,
      front,back:leatherBack(back),bottomPages,forePages,
      spineCrop:[x0-info.origin[0],y0-info.origin[1],x1-x0,y1-y0]}];
  }));
  return {A:a,...Object.fromEntries(others)};
}
