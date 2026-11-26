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
      const errors=[];page.on("pageerror",e=>errors.push(e.message));
      assert.equal((await page.goto(root,{waitUntil:"domcontentloaded"})).status(),401);
      const opening=page.locator("#opening canvas");
      await opening.waitFor({state:"visible"});
      await page.waitForTimeout(1000);
      assert.ok(await painted(opening),"opening canvas must draw");
      await page.locator("#skip").click();
      await page.locator("#login").waitFor({state:"visible"});
      await page.waitForTimeout(150);
      assert.ok(await painted(page.locator("#login .brand canvas")),"static mark must draw");
      assert.equal(await page.locator("#identity-technology .technology-orbits path").count(),8);
      await page.locator("#replay").click();
      await page.locator("#skip").click();
      await page.locator("#login").waitFor({state:"visible"});
      // Never send a real login attempt. Route handles the synthetic failure in the browser.
      await page.route("**/api/member-session",async route=>{await new Promise(r=>setTimeout(r,650));await route.fulfill({status:401,contentType:"application/json",body:JSON.stringify({error:"Synthetic browser test"})});});
      await page.locator("#password").fill("synthetic-not-a-member-password");
      await page.locator("#entry button[type=submit]").click();
      await page.locator("#entry-loading").waitFor({state:"visible"});
      await page.waitForTimeout(100);
      assert.ok(await painted(page.locator("#entry-loading canvas")),"loading canvas must draw");
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
