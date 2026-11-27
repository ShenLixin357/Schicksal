"""Patch the extracted test only; preserve R4 archive and all product bytes."""
import pathlib,sys
p=pathlib.Path(sys.argv[1])
s=p.read_text()
old="   shelf(page,'R1').click();shelf(page,'L1').click();reading(page,'L1');restore(page,room);print('PASS quick switch and skip',flush=True)"
assert s.count(old)==1
new="""   # Separate context makes the rapid-selection test independent from accumulated scene work.
   # Both trusted pointer clicks must arrive within the frozen 340 ms selection window.
   # Verify selected book before skipping; all 11 full animations were already asserted above.
   from datetime import datetime,timezone
   rapid_ctx=browser.new_context(viewport={'width':1440,'height':950},reduced_motion='no-preference')
   try:
    rp=rapid_ctx.new_page();rp.clock.install();rr=load(rp)
    boxes=[shelf(rp,b).bounding_box() for b in ('R1','L1')]
    assert all(boxes)
    rp.evaluate(\"\"\"()=>{window.__rapid=[];const root=document.querySelector('#library').shadowRoot;root.addEventListener('click',e=>{const b=e.composedPath().find(x=>x.dataset?.book);if(b)window.__rapid.push({book:b.dataset.book,time:performance.now(),trusted:e.isTrusted});},true)}\"\"\")
    rp.clock.pause_at(datetime.fromtimestamp((rp.evaluate('Date.now()')+1500)/1000,timezone.utc))
    try:
     for i,b in enumerate(boxes):
      rp.mouse.click(b['x']+b['width']/2,b['y']+b['height']/2)
      if i==0:rp.clock.run_for(50)
     events=rp.evaluate('window.__rapid')
     assert [e['book'] for e in events]==['R1','L1'] and all(e['trusted'] for e in events),events
     assert 0<=events[1]['time']-events[0]['time']<340,events
     rp.clock.run_for(350)
     expect(rr).to_have_attribute('data-mode','summoning',timeout=5000)
     expect(rp.locator('#book-title')).to_have_text('L1')
    finally:rp.clock.resume()
    rp.locator('#skip').click();reading(rp,'L1')
    restore(rp,rr)
    print('PASS rapid trusted clicks, latest target selected, skip and return',events,flush=True)
   finally:rapid_ctx.close()"""
p.write_text(s.replace(old,new))
