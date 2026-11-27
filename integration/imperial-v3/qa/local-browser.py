import os,sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=os.environ['SCHICKSAL_LOCAL_URL']
password=os.environ['SCHICKSAL_TEST_PASSWORD']
report=Path(os.environ['V32_REPORT'])
engine=sys.argv[1]
with sync_playwright() as p:
    browser=getattr(p,engine).launch(headless=True)
    context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=2,reduced_motion='reduce')
    page=context.new_page()
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    try:
        response=page.goto(root,wait_until='domcontentloaded')
        assert response.status==401
        # Reduced motion intentionally bypasses opening.
        expect(page.locator('#login')).to_be_visible(timeout=15000)
        expect(page.locator('#opening')).to_be_hidden()
        print('PASS reduced-motion opening bypass')
        page.locator('#identity-amberina').click()
        page.locator('#password').fill(password)
        page.locator('#entry button[type=submit]').click()
        expect(page.locator('.mandatory-briefing-gate')).to_be_attached(timeout=45000)
        expect(page.locator('#imperial-sidebar')).to_have_count(0)
        # The brief's hero must have native layout dimensions, not a 42px
        # composited canvas scaled up by CSS. Verify each breakpoint at DPR 2.
        for viewport_width, expected_width in [(1440,218.4),(900,205.8),(600,132.3),(1440,218.4)]:
            page.set_viewport_size({'width':viewport_width,'height':900})
            page.wait_for_function("""expected => {
              const mark=document.querySelector('.imperial-briefing-emblem-art > .emblem.compact');
              const canvas=mark?.querySelector('canvas');
              if(!canvas)return false;
              const rect=canvas.getBoundingClientRect();
              return getComputedStyle(mark).transform==='none' &&
                Math.abs(mark.getBoundingClientRect().width-expected)<1 &&
                Math.abs(rect.width-expected)<1 &&
                canvas.width>=Math.round(rect.width*devicePixelRatio)-1 &&
                canvas.height>=Math.round(rect.height*devicePixelRatio)-1;
            }""",arg=expected_width,timeout=15000)
        page.locator('.imperial-briefing-emblem-art').screenshot(path=str(report/'briefing-emblem.png'))
        print('PASS native-sized briefing emblem at desktop/tablet/mobile DPR 2')
        page.get_by_role('button',name='关闭帝国简报，返回天命首页').click()
        expect(page.locator('#imperial-sidebar')).to_be_visible(timeout=20000)
        nav=page.locator('#imperial-navigation')
        nav.locator('button[title="帝国馆藏"]').click()
        nav.get_by_role('button',name='魔法图书馆',exact=True).click()
        expect(page.locator('.library-scene-content')).to_have_attribute('data-ready','true',timeout=90000)
        host=page.locator('.library-native-host')
        expect(host.locator('#room')).to_have_attribute('data-mode','idle')
        expect(host.locator('#shelf-hotspots button')).to_have_count(11)
        expect(host.locator('#open-catalog')).to_have_count(0)
        host.locator('#settings-toggle').click()
        expect(host.locator('#room-controls')).to_be_visible()
        expect(host.locator('#room-controls button')).to_have_count(4)
        candle=host.locator('#room-controls button[data-light="candle"]')
        expect(candle).to_have_count(1)
        expect(candle).to_have_text('烛火')
        expect(candle).to_have_attribute('aria-pressed','true')
        candle.click()
        expect(candle).to_have_attribute('aria-pressed','false')
        candle.click()
        expect(candle).to_have_attribute('aria-pressed','true')
        host.locator('#settings-toggle').click()
        host.locator('#crest').click()
        expect(host.locator('#summon')).to_be_visible()
        host.locator('#close-catalog').click()
        host.locator('[data-book="A"]').dblclick()
        expect(host.locator('#reader')).to_be_visible(timeout=15000)
        host.locator('#cover-button').click()
        expect(host.locator('#cover-view')).to_be_visible(timeout=10000)
        host.locator('#resume-button').click()
        host.locator('#return-button').click()
        expect(host.locator('#room')).to_have_attribute('data-mode','idle',timeout=30000)
        page.screenshot(path=str(report/'library.png'))
        nav.locator('button[title="首页"]').click()
        expect(page.locator('.library-native-host')).to_have_count(0)
        assert not errors,errors
        print('PASS real authenticated entry, mandatory briefing, R5 first frame, 11 hotspots, settings, crest, read/cover/return and teardown')
    except Exception:
        page.screenshot(path=str(report/'failure.png'))
        try:
            (report/'failure-dom.html').write_text(page.content(),encoding='utf-8')
            (report/'failure-library-shadow.html').write_text(page.locator('.library-native-host').evaluate('(el) => el.shadowRoot?.innerHTML ?? ""',timeout=2000),encoding='utf-8')
        except Exception as diagnostic_error:
            print('DOM diagnostic unavailable:',diagnostic_error)
        print('Failure URL:',page.url,'page errors:',errors)
        raise
    finally:
        try: page.request.delete(root+'/api/member-session',headers={'Origin':root})
        except Exception: pass
        context.close()
        browser.close()
