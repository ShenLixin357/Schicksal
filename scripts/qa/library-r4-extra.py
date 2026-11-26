"""Supplemental R4 debugger and lifecycle checks; no member data or remote access."""
import functools, http.server, pathlib, shutil, sys, tempfile, threading, json, base64
from playwright.sync_api import sync_playwright, expect
pkg,report,engine=pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]),sys.argv[3]
assert engine in ("chromium","webkit")
ids=["A","L1","L2","L3","L4","R1","R2","R3","R4","LT","AVS"]
with tempfile.TemporaryDirectory() as tmp:
    public=pathlib.Path(tmp)/"public"
    shutil.copytree(pkg/"overlay/public",public)
    (public/"library/debug-test.html").write_text("""<!doctype html><meta charset=utf-8><div id=library></div><script type=module>
import {mountLibrary} from './library/catalog/mount.js';
window.remount=()=>{window.disposeLibrary=mountLibrary(document.getElementById('library'),{debug:true});};
window.remount();
</script>""",encoding="utf-8")
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self,*args): pass
    server=http.server.ThreadingHTTPServer(("127.0.0.1",0),functools.partial(Quiet,directory=str(public)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as w:
            browser=getattr(w,engine).launch()
            context=browser.new_context(viewport={"width":1440,"height":950},reduced_motion="reduce")
            page=context.new_page()
            errors=[]
            page.on("pageerror",lambda e:errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{server.server_port}/library/debug-test.html")
            room=page.locator("#room");expect(room).to_have_attribute("data-mode","idle",timeout=45000)
            panel=page.locator(".library-debug");panel.locator("summary").click()
            select=page.get_by_label("调试书籍")
            expect(select.locator("option")).to_have_count(11)
            button=lambda name:page.get_by_role("button",name=name,exact=True)
            for book in ids:
                select.select_option(book)
                button("播放 / 继续").click()
                expect(room).to_have_attribute("data-mode","debug")
                button("暂停").click();button("前进一帧 +1/60 s").click()
                button("复位至 0").click()
                assert float(page.get_by_label("调试时间轴").input_value())==0
                button("停止并归位").click();expect(room).to_have_attribute("data-mode","idle")
            select.select_option("R3");button("重新播放").click()
            page.get_by_label("调试播放倍率").select_option("2")
            for name in ["循环","轨迹与时间标记","固定徽记角度"]:
                b=button(name);before=b.get_attribute("aria-pressed");b.click();assert b.get_attribute("aria-pressed")!=before
            angle=page.get_by_label("徽记角度");expect(angle).to_be_enabled()
            angle.evaluate("(e)=>{e.value='120';e.dispatchEvent(new Event('input',{bubbles:true}));}")
            assert angle.input_value()=="120"
            scrub=page.get_by_label("调试时间轴")
            scrub.evaluate("(e)=>{e.value=Number(e.max)/2;e.dispatchEvent(new Event('input',{bubbles:true}));}")
            assert float(scrub.input_value())>0
            button("导出草稿 JSON").click();out=page.get_by_label("调试配置 JSON")
            obj=json.loads(out.input_value());assert obj["revision"]=="handoff-2026-11-27" and "R3" in obj["drafts"]
            # Import and restore only within local debug memory.
            out.fill(json.dumps(obj));button("导入草稿 JSON").click();expect(room).to_have_attribute("data-mode","debug")
            out.fill("{}");button("导入草稿 JSON").click();assert "配置不合法" in out.input_value()
            button("恢复最终定稿").click();button("停止并归位").click()
            panel.locator("summary").click()
            for name in ["徽记动画","轨道定位","原画对照"]:
                b=button(name);old=b.get_attribute("aria-pressed");b.click();assert b.get_attribute("aria-pressed")!=old;b.click()
            for name in ["左梯轨道位置","右梯轨道位置"]:
                slider=page.get_by_label(name);slider.evaluate("(e)=>{e.value='50';e.dispatchEvent(new Event('input',{bubbles:true}));}")
            for name in ["左梯 ←","左梯 原位","左梯 →","右梯 ←","右梯 原位","右梯 →","全部灯光开 / 关","全部灯光开 / 关","左旗 · 微风","内旗 · 强风","外旗 · 微风"]:
                button(name).click()
            for key in ["candle","dome","window"]:
                b=page.locator(f"[data-light='{key}']");old=b.get_attribute("aria-pressed");b.click();assert b.get_attribute("aria-pressed")!=old;b.click()
            panel.locator("summary").click()
            png=base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1k8AAAAASUVORK5CYII=")
            page.get_by_label("试换旗帜标志").set_input_files({"name":"fixture.png","mimeType":"image/png","buffer":png})
            expect(panel.get_by_text("仅本地预览，未发布")).to_be_visible(timeout=10000)
            button("恢复原旗帜标志").click();button("停止并归位").click()
            panel.locator("summary").click()
            # Measure detached canvas backing-store release and optional Chromium heap diagnostics.
            heap=[]
            cdp=context.new_cdp_session(page) if engine=="chromium" else None
            for _ in range(5):
                result=page.evaluate("""()=>{const root=document.getElementById('library').shadowRoot;
                const room=root.getElementById('room'),cover=root.getElementById('cover');
                window.disposeLibrary();
                return {room:[room.width,room.height],cover:[cover.width,cover.height],children:root.childNodes.length};}""")
                assert result=={"room":[0,0],"cover":[0,0],"children":0},result
                if cdp:
                    cdp.send("HeapProfiler.collectGarbage")
                    heap.append(cdp.send("Runtime.getHeapUsage"))
                page.evaluate("window.remount()")
                expect(room).to_have_attribute("data-mode","idle",timeout=45000)
            page.evaluate("window.disposeLibrary()")
            expect(room).to_have_count(0)
            if cdp: (report/"chromium-heap-diagnostics.json").write_text(json.dumps(heap,indent=2))
            assert not errors,errors
            print("PASS 11 debugger choices, controls, local flag preview, five backing-store teardown cycles",engine,flush=True)
            context.close();browser.close()
    finally: server.shutdown()
