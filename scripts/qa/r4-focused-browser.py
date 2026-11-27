"""Focused diagnostics; no production access, no runtime edits or synthetic authorization."""
import argparse, os, pathlib, tempfile, shutil, functools, http.server, threading, json
from datetime import datetime, timezone
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright, expect
p=argparse.ArgumentParser();p.add_argument("mode",nargs="?",default="main",choices=["fixture","main"]);p.add_argument("--engine",choices=["chromium","webkit"],required=True);p.add_argument("--full-motion",action="store_true");a=p.parse_args()
pkg=pathlib.Path(os.environ["RUNNER_TEMP"])/"library-r4/library-candidate"
with sync_playwright() as w:
 browser=getattr(w,a.engine).launch()
 failures=[]
 def check(name,fn):
  try:fn();print("PASS",name,flush=True)
  except Exception as e:
   # Exception messages from assertions contain no request headers or credentials.
   failures.append(name);print("FAIL",name,str(e)[:1800],flush=True)
 try:
  if a.mode=="fixture":
   with tempfile.TemporaryDirectory() as folder:
    public=pathlib.Path(folder)/"public";shutil.copytree(pkg/"overlay/public",public)
    (public/"library/preview-local.html").write_text((pkg/"local-preview/preview-local.html").read_text())
    class Quiet(http.server.SimpleHTTPRequestHandler):
     def log_message(self,*args):pass
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(public)));threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f"http://127.0.0.1:{server.server_port}/library/preview-local.html"
    def shelf(page,b):return page.locator(f'[data-book="{b}"]')
    def load(page):
     page.goto(base);room=page.locator("#room");expect(room).to_have_attribute("data-mode","idle",timeout=30000);return room
    def read(page,b):
     expect(page.locator("#reader")).to_be_visible(timeout=35000);expect(page.locator("#book-title")).to_have_text(b)
    def rapid():
     ctx=browser.new_context(viewport={"width":1440,"height":950},reduced_motion="no-preference")
     try:
      page=ctx.new_page();page.clock.install();room=load(page)
      # Compute both locations before the first click; no second Locator auto-wait.
      boxes=[shelf(page,b).bounding_box() for b in ("R1","L1")]
      assert all(boxes)
      page.evaluate("""()=>{window.__r4Clicks=[];const root=document.querySelector('#library').shadowRoot;root.addEventListener('click',e=>{const b=e.composedPath().find(x=>x.dataset?.book);if(b)window.__r4Clicks.push({book:b.dataset.book,time:performance.now(),mode:root.getElementById('room').dataset.mode,trusted:e.isTrusted});},true)}""")
      try:
       # Hold only the selection clock while issuing trusted browser inputs.
       # The long visual animation runs in real time after resume.
       page.clock.pause_at(datetime.fromtimestamp((page.evaluate("Date.now()")+1500)/1000,timezone.utc))
       try:
        for index,b in enumerate(boxes):
         page.mouse.click(b["x"]+b["width"]/2,b["y"]+b["height"]/2)
         if index==0:page.clock.run_for(50)
        events=page.evaluate("window.__r4Clicks")
       finally:page.clock.resume()
       print("POINTER_TRACE",json.dumps(events),flush=True)
       assert [x["book"] for x in events]==["R1","L1"],"Both actual pointer hits must reach intended books"
       assert all(x["trusted"] for x in events),"Must use real browser pointer"
       assert 0<=events[1]["time"]-events[0]["time"]<340,"Controlled input exceeded approved pending-selection window"
       read(page,"L1");page.locator("#return-button").click();expect(room).to_have_attribute("data-mode","idle",timeout=35000)
      finally: print("POINTER_FINAL",json.dumps(page.evaluate("window.__r4Clicks")),flush=True)
     finally:ctx.close()
    def full():
     ctx=browser.new_context(viewport={"width":1440,"height":950},reduced_motion="reduce")
     try:
      page=ctx.new_page();room=load(page)
      page.get_by_role("button",name="全屏查看",exact=True).click();expect(room).to_be_visible()
      page.locator("#crest").click();expect(page.locator("#summon")).to_be_visible()
      page.locator("#close-catalog").click();expect(page.locator("#summon")).not_to_be_visible()
      page.keyboard.press("Escape");page.set_viewport_size({"width":1024,"height":768});expect(room).to_be_visible()
      page.set_viewport_size({"width":1440,"height":950});expect(page.locator(".library-debug")).to_have_count(0)
      page.evaluate("window.disposeLibrary()");expect(room).to_have_count(0)
     finally:ctx.close()
    def touch():
     ctx=browser.new_context(viewport={"width":390,"height":844},has_touch=True,is_mobile=True,reduced_motion="reduce")
     try:
      page=ctx.new_page();room=load(page);shelf(page,"R3").tap();read(page,"R3");page.locator("#return-button").click();expect(room).to_have_attribute("data-mode","idle")
      page.locator("#crest").tap();page.locator("#query").fill("R4");page.locator(".result-main").first.tap();read(page,"R4");page.locator("#return-button").click();expect(room).to_have_attribute("data-mode","idle")
     finally:ctx.close()
    try:
     check("trusted rapid switch with controlled interval inside frozen 340ms window",rapid);check("fullscreen/modal/resize/unmount",full);check("touch shelf and catalog",touch)
    finally:server.shutdown()
  else:
   base=os.environ["SCHICKSAL_LOCAL_URL"].rstrip("/");assert urlsplit(base).hostname in ("127.0.0.1","localhost","::1")
   sha=os.environ["SCHICKSAL_LOCAL_SHA"]
   def login(office,motion):
    ctx=browser.new_context(viewport={"width":1440,"height":950},reduced_motion=motion)
    page=ctx.new_page();events=[];errors=[];resources=[];failed_requests=[];console_errors=[]
    def on_response(r):
     path=urlsplit(r.url).path
     if path.startswith("/api/"):events.append([r.request.method,path,r.status])
     elif r.request.resource_type in ("document","script","stylesheet"):resources.append([r.request.resource_type,path,r.status,r.headers.get("content-type","")])
    page.on("response",on_response)
    page.on("requestfailed",lambda r:failed_requests.append([r.resource_type,urlsplit(r.url).path,r.failure]))
    page.on("pageerror",lambda e:errors.append(str(e)[:200]))
    page.on("console",lambda m:console_errors.append(m.text[:200]) if m.type=="error" else None)
    try:
     assert page.goto(base,wait_until="domcontentloaded").status==401
     assert page.request.get(base+"/api/library/debug").status==401
     skip=page.locator("#skip")
     if skip.is_visible():skip.click()
     expect(page.locator("#login")).to_be_visible(timeout=30000)
     page.locator("#identity-"+("technology" if office else os.environ["SCHICKSAL_TEST_MEMBER"])).click()
     page.locator("#password").fill(os.environ["SCHICKSAL_TEST_TECH_PASSWORD" if office else "SCHICKSAL_TEST_PASSWORD"])
     page.locator("#entry button[type=submit]").click()
     try:
      expect(page.locator(".welcome")).to_be_visible(timeout=30000)
      expect(page.locator(".mandatory-briefing-gate")).to_be_attached(timeout=35000)
      expect(page.get_by_role("dialog",name="帝国简报")).to_be_visible()
      expect(page.locator("#imperial-sidebar")).to_have_count(0)
      version=page.request.get(base+"/api/preview-version")
      assert version.status==200 and version.json()=={"preview":True,"sourceSha":sha}
      assert page.request.get(base+"/api/library/debug").status==(200 if office else 403)
      page.get_by_role("button",name="关闭帝国简报，返回天命首页").click()
      expect(page.locator("#imperial-sidebar")).to_be_visible()
     finally:
      print("LOGIN_TRACE",json.dumps({"office":office,"events":events,"pageErrors":errors,"path":urlsplit(page.url).path,"login":page.locator("#login").count(),"welcome":page.locator(".welcome").count(),"gate":page.locator(".mandatory-briefing-gate").count(),"sidebar":page.locator("#imperial-sidebar").count(),"welcomeStatus":page.locator(".welcome-preload-status").all_text_contents()}),flush=True)
      print("ENTRY_DIAGNOSTIC",json.dumps({"motion":motion,"office":office,"resources":resources[-60:],"failedRequests":failed_requests[-30:],"consoleErrors":console_errors[-15:],"dom":page.evaluate("""()=>({ready:document.readyState,title:document.title,main:[...document.querySelectorAll('main')].map(e=>({id:e.id,cls:e.className,children:e.childElementCount})),opening:document.querySelectorAll('.opening').length,reactLogin:document.querySelectorAll('.login').length,bodyChildren:[...document.body.children].map(e=>[e.tagName,e.id,e.className?.toString().slice(0,80)]).slice(0,20),scriptCount:document.scripts.length,entryComplete:sessionStorage.getItem('schicksal:entry-complete')==='1'})""")}),flush=True)
      for path in ("/api/member-session","/api/briefing","/api/briefing-session","/api/offices/current","/api/preview-version"):
       r=page.request.get(base+path);print("DIAGNOSTIC_GET",path,r.status,flush=True)
       if path=="/api/member-session" and r.ok:
        body=r.json();print("SESSION_SHAPE",json.dumps({"hasCitizen":bool(body.get("citizenId")),"matchesExpected":body.get("citizenId")==os.environ["SCHICKSAL_TEST_MEMBER"],"accountMode":body.get("accountMode"),"authSource":body.get("authSource")}),flush=True)
     assert not errors,errors
    finally:
     page.request.delete(base+"/api/member-session",headers={"Origin":base});ctx.close()
   for motion in ("no-preference","reduce"):
    check("ordinary authenticated entry and mandatory briefing "+motion,lambda:login(False,motion))
    check("minister direct authenticated entry and mandatory briefing "+motion,lambda:login(True,motion))
 finally:browser.close()
assert not failures,failures
