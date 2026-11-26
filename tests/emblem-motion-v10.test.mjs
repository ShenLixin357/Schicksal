import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";
import { EMBLEM_MOTION, bladeOutline, emblemFacets, sampleEmblem, technologyRingSvg, mountEmblem } from "../app/emblem/motion-v10.ts";
import { CITIZENS } from "../app/citizens.ts";
const colors=CITIZENS.map(c=>c.accent);
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("V10 exact approved defaults, palette and single refined contour",()=>{
  assert.deepEqual(colors,["#F3ED87","#D7263D","#eecf58","#65cae9","#a99ce6","#48ad83","#ef9148","#e982ad"]);
  assert.deepEqual(Object.values(EMBLEM_MOTION),[20,4.236,.618,3,.01,420,230,900,350,28,360,4200,4300,15,.3,2.875,13,86]);
  assert.equal((bladeOutline().match(/Q/g)||[]).length,2);
  assert.match(bladeOutline(),/^M 0 -87\.72/);
  assert.match(bladeOutline(),/L 0 -3 /);
  const base=emblemFacets(colors),light=emblemFacets(colors,.3);
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)assert.equal(light[i][j],"rgb("+base[i][j].match(/\d+/g).map(v=>Math.round(Number(v)*.7+255*.3)).join(",")+")");
  const ring=technologyRingSvg(colors);
  assert.equal((ring.match(/<g transform=/g)||[]).length,4);
  assert.equal((ring.match(/<path /g)||[]).length,8);
  assert.equal((ring.match(/stroke-width="2\.875"/g)||[]).length,4);
  for(const color of colors)assert.ok(ring.includes('stroke="'+color+'"'));
});
test("15 equal beats; no transparency, early ghosts or blank frames; exact yellow wrap",()=>{
  const beat=4300/15;
  for(let k=0;k<15000;k++){
    const age=(k+.5)*4300/15000,step=Math.floor(age/beat),p=age/beat-step;
    const poses=sampleEmblem("loading",age);
    assert.equal(poses.length,step<7?step+2:step<14?15-step:1);
    assert.ok(poses.every(r=>r.opacity===1&&r.scale===1&&r.dy===0));
    assert.equal(new Set(poses.map(r=>r.i)).size,poses.length);
    const moving=poses[0];
    assert.equal(moving.i,step<7?step+1:step<14?step-7:7);
    assert.ok(Math.abs(moving.angle-((step<7?step:step<14?step-7:7)*45+45*p))<1e-8);
  }
  assert.deepEqual(sampleEmblem("loading",0),sampleEmblem("loading",4300));
  assert.deepEqual(sampleEmblem("loading",0).map(p=>p.i),[0]);
  assert.equal(sampleEmblem("loading",4300-.001)[0].i,7);
  assert.equal(sampleEmblem("loading",4300)[0].angle,0);
});
test("opening grows from center, holds complete for 900ms, then scatters",()=>{
  assert.equal(sampleEmblem("opening",359).length,0);
  const entering=sampleEmblem("opening",460)[0];
  assert.ok(entering.dy>0&&entering.scale<1);
  const complete=sampleEmblem("opening",2390);
  assert.equal(complete.length,8);assert.ok(complete.every(r=>r.dy===0&&r.scale===1&&r.opacity===1));
  assert.deepEqual(sampleEmblem("opening",3289),complete);
  assert.ok(sampleEmblem("opening",3400).some(r=>r.dy<0));
  assert.equal(sampleEmblem("opening",3837).length,0);
});
test("public nonce script serialization parses; the V10 engine is isolated from Lounge",()=>{
  new Script("("+mountEmblem.toString()+")");
  const sampler=new Script("("+sampleEmblem.toString()+")").runInNewContext();
  assert.equal(sampler("loading",4300)[0].i,0);
  const page=read("app/page.tsx"),scope=read("app/emblem/imperial-loading.tsx"),sus=read("app/shell/feature-suspense.tsx");
  assert.match(page,/ImperialLoadingScope enabled=\{!clubOpen && !portal\}/);
  assert.match(page,/label="委员会 Lounge" onExit=\{\(\) => setSection\("home"\)\} lounge/);
  assert.match(scope,/parent&&enabled/);
  assert.match(sus,/\{!lounge && <ImperialLoading/);
  assert.doesNotMatch(read("app/transitions/lounge-passage.tsx"),/ImperialLoading/);
  assert.doesNotMatch(read("app/club/committee-lounge.tsx"),/ImperialLoading/);
  assert.match(read("app/entry-screen.ts"),/technologyMark\(\)/);
  assert.match(page,/accountMode==="technology"\?<TechnologyEmblem/);
});

test("opening-only orbit retains original styling and starts with the eighth blade",()=>{
  const css=read("app/entry.css"),entry=read("app/entry-screen.ts"),compact=read("app/emblem/compact-emblem.tsx");
  assert.match(css,/width:clamp\(188px,32vmin,250px\)/);
  assert.match(css,/inset:13%; border:1px solid rgba\(62,102,130,\.2\)/);
  const engine=read("app/emblem/motion-v10.ts");
  assert.match(engine,/ease\(\(age-1970\)\/650\)/);
  assert.match(engine,/ease\(\(age-1970\)\/800\)/);
  assert.match(engine,/clamp\(\(age-3836\)\/360\)/);
  assert.equal(EMBLEM_MOTION.openingDelay+7*EMBLEM_MOTION.interval,1970);
  assert.equal(EMBLEM_MOTION.openingDelay+7*EMBLEM_MOTION.interval+EMBLEM_MOTION.grow,2390);
  assert.doesNotMatch(engine,/\.12\*fall/);
  assert.match(entry,/compact \? "" : '<span class="opening-orbit-v10"/);
  assert.match(compact,/\{ceremonial && <span className="opening-orbit-v10"/);
  assert.doesNotMatch(read("app/emblem/imperial-loading.tsx"),/opening-orbit-v10/);
});


test("single orbit remains at full size until all blades vanish, then expands to 140% and fades",()=>{
  // Exercise the real self-contained browser renderer at exact time points.
  let age=0,next;
  const orbit={style:{},dataset:{}};
  const ctx=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{
    get:(target,key)=>key in target?target[key]:()=>{}
  });
  const canvas={width:0,height:0,getContext:()=>ctx,getBoundingClientRect:()=>({width:250}),parentElement:{querySelector:()=>orbit}};
  const reduced={matches:false,addEventListener(){},removeEventListener(){}};
  const sandbox={document:{createElement:()=>({width:0,height:0,getContext:()=>ctx})},window:{devicePixelRatio:1,matchMedia:()=>reduced},Path2D:class{},performance:{now:()=>age},requestAnimationFrame:fn=>(next=fn,1),cancelAnimationFrame(){}};
  const mount=new Script("("+mountEmblem.toString()+")").runInNewContext(sandbox);
  const dispose=mount(canvas,"opening",bladeOutline(),emblemFacets(colors),sampleEmblem);
  function frameAt(t){
    age=t;next();
    return {opacity:Number(orbit.style.opacity),scale:Number(orbit.style.transform.match(/scale\(([^)]+)\)/)[1])};
  }
  assert.deepEqual(frameAt(1969),{opacity:0,scale:.72});
  assert.ok(frameAt(2100).opacity>0);
  assert.deepEqual(frameAt(2770),{opacity:1,scale:1});
  assert.deepEqual(frameAt(3835),{opacity:1,scale:1});
  assert.ok(sampleEmblem("opening",3835).length>0);
  assert.equal(sampleEmblem("opening",3836).length,0);
  assert.deepEqual(frameAt(3836),{opacity:1,scale:1});
  const half=frameAt(4016);
  assert.ok(Math.abs(half.opacity-.5)<1e-10);
  assert.ok(Math.abs(half.scale-1.3)<1e-10);
  assert.deepEqual(frameAt(4196),{opacity:0,scale:1.4});
  assert.deepEqual(frameAt(4200),{opacity:0,scale:1.4});
  dispose();
});
