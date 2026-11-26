/** Read-only authenticated UI verification against isolated preview only.
 * No production login, no member data mutation; revoke the test session. */
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
const root="https://schicksal-ui-preview.m17686100216.workers.dev";
const password=JSON.parse(process.env.SCHICKSAL_PREVIEW_PASSWORDS||"{}").amberina;
assert.ok(typeof password==="string"&&password.length>=12,"Missing preview-only password");
console.log("::add-mask::"+password);
for(const [name,engine,delay] of [["Chromium",chromium,0],["WebKit",webkit,0],["Chromium slow briefing",chromium,5200]]){
  const browser=await engine.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await context.newPage();
  let signedIn=false;
  try{
    const r=await page.goto(root,{waitUntil:"domcontentloaded"});
    assert.equal(r.status(),401);
    await page.locator("#skip").click();
    await page.locator("#login").waitFor({state:"visible"});
    assert.equal(await page.locator("#identity-technology .technology-orbits g[stroke-width='2.875']").count(),4);
    if(delay){
      await page.route("**/api/briefing",async route=>{await new Promise(resolve=>setTimeout(resolve,delay));await route.continue();});
    }
    await page.locator("#identity-amberina").click();
    await page.locator("#password").fill(password);
    await page.locator("#entry button[type=submit]").click();
    signedIn=true;
    // No click on ENTER NOW. Automatic entry must reach the mandatory briefing.
    await page.locator(".welcome").waitFor({state:"visible",timeout:30000});
    await page.locator(".mandatory-briefing-gate").waitFor({state:"attached",timeout:35000});
    await page.getByRole("dialog",{name:"帝国简报"}).waitFor({state:"visible"});
    assert.equal(await page.locator("#imperial-sidebar").count(),0,"Briefing gate must not be bypassed");
    const version=await page.request.get(root+"/api/preview-version");
    assert.equal(version.status(),200);
    const v=await version.json();
    assert.equal(v.preview,true);
    assert.equal(v.sourceSha,process.env.GITHUB_SHA);
    console.log("PASS "+name+" automatic Welcome -> mandatory briefing, no ENTER NOW click, exact preview SHA");
  }finally{
    if(signedIn){const logout=await page.request.delete(root+"/api/member-session",{headers:{Origin:root}});assert.ok(logout.ok(),"Preview test logout failed");}
    await context.close();await browser.close();
  }
}
