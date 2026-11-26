/** Anonymous entry smoke only. No real member passwords or production writes.
 * With no URL, serve real source-generated response under its CSP locally. */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { chromium, webkit } from "playwright";
let server,root=process.env.SCHICKSAL_ENTRY_TEST_URL;
if(!root){
  const { privateLoginResponse }=await import("../../app/private-login.ts");
  server=createServer(async(req,res)=>{
    const r=privateLoginResponse(true);
    res.writeHead(r.status,Object.fromEntries(r.headers));
    res.end(await r.text());
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  root="http://127.0.0.1:"+server.address().port;
}
async function painted(locator){
  return locator.evaluate(el=>{const c=el.getContext("2d");return c.getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0);});
}
try{
  for(const [name,engine] of [["Chromium",chromium],["WebKit",webkit]]){
    const browser=await engine.launch({headless:true});
    try{
      const page=await browser.newPage({viewport:{width:1440,height:900}});
      const errors=[];page.on("pageerror",e=>{errors.push(e.message);console.log(name+" page error: "+e.message);});
      // Observe the complete animation from document creation, not just the
      // short interval after the potentially slow canvas pixel readback.
      await page.addInitScript(()=>{
        window.__orbitPeak=0;
        window.__orbitFrames=[];
        const capture=()=>{
          const orbit=document.querySelector("#opening .opening-orbit-v10");
          if(orbit && !document.getElementById("opening").hidden){
            const opacity=Number(orbit.style.opacity)||0;
            window.__orbitPeak=Math.max(window.__orbitPeak,opacity);
            if(orbit.dataset.openingAge)window.__orbitFrames.push({age:Number(orbit.dataset.openingAge),opacity,transform:orbit.style.transform});
          }
        };
        new MutationObserver(capture).observe(document,{subtree:true,childList:true,attributes:true,attributeFilter:["style","hidden"]});
      });
      await page.bringToFront();
      assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"})).status(),401);
      const opening=page.locator("#opening canvas");
      await opening.waitFor({state:"visible"});
      // Poll the actual rendered alpha during the active reveal, rather than a single timing-sensitive sample.
      const waitForPaint=async selector=>{await page.waitForFunction(sel=>{const el=document.querySelector(sel);if(!el||!el.getBoundingClientRect().width)return false;const c=el.getContext("2d");return c.getImageData(0,0,el.width,el.height).data.some((v,i)=>i%4===3&&v>0);},selector,{polling:50,timeout:3500});};
      try{await waitForPaint("#opening canvas");}catch(e){console.log(name+" render diagnostic: "+JSON.stringify(await opening.evaluate(el=>({w:el.width,h:el.height,rect:el.getBoundingClientRect().toJSON(),visible:document.visibilityState,path2d:typeof Path2D,raf:typeof requestAnimationFrame,openingHidden:document.getElementById("opening").hidden}))));throw e;}
      assert.deepEqual(errors,[]);
      const orbit=page.locator("#opening .opening-orbit-v10");
      assert.equal(await orbit.count(),1);
      assert.ok(await opening.evaluate(el=>el.getBoundingClientRect().width>=245),"desktop opening should be enlarged");
      await page.locator("#login").waitFor({state:"visible",timeout:10000});
      const orbitPeak=await page.evaluate(()=>window.__orbitPeak);
      console.log(name+" opening orbit peak opacity: "+orbitPeak);
      assert.ok(orbitPeak>.5,"Opening orbit must visibly appear during the full opening sequence");
      const orbitFrames=await page.evaluate(()=>window.__orbitFrames);
      assert.ok(orbitFrames.every(f=>f.age>=1970||f.opacity===0),"No orbit before the eighth blade starts");
      assert.ok(orbitFrames.some(f=>f.age>=1970&&f.age<2390&&f.opacity>0),"Orbit must appear while the eighth blade is still moving");
      assert.ok(orbitFrames.some(f=>f.age>=2770&&f.age<=3850&&f.opacity>.99&&f.transform==="scale(1) rotate(0deg)"),"Orbit holds at original size during the completed emblem");
      await waitForPaint("#login .brand canvas");
      assert.equal(await page.locator("#login .opening-orbit-v10").count(),0);
      assert.equal(await page.locator("#identity-technology .technology-orbits path").count(),8);
      assert.equal(await page.locator("#identity-technology .technology-orbits g[stroke-width='2.875']").count(),4);
      await page.locator("#replay").click();
      await page.locator("#skip").click();
      await page.locator("#login").waitFor({state:"visible"});
      // Never send a real login attempt. Route handles the synthetic failure in the browser.
      await page.route("**/api/member-session",async route=>{await new Promise(r=>setTimeout(r,1100));await route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({error:"Synthetic browser test"})});});
      await page.locator("#password").fill("synthetic-not-a-member-password");
      await page.locator("#entry button[type=submit]").click();
      await page.locator("#entry-loading").waitFor({state:"visible"});
      await waitForPaint("#entry-loading canvas");
      await page.locator("#entry-loading").waitFor({state:"hidden"});
      assert.deepEqual(errors,[]);
      await page.emulateMedia({reducedMotion:"reduce"});
      await page.reload({waitUntil:"domcontentloaded"});
      await page.locator("#login").waitFor({state:"visible"});
      assert.equal(await page.locator("#opening").isVisible(),false);
      assert.deepEqual(errors,[]);
      console.log("PASS "+name+" anonymous entry, opening, skip, replay, loading, ring, reduced motion");
    }finally{await browser.close();}
  }
}finally{if(server)await new Promise(resolve=>server.close(resolve));}
