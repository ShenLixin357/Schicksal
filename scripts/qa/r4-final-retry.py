"""Retry only the failed and not-yet-executed Chromium checks after verified full animation evidence."""
import pathlib,sys
p=pathlib.Path(sys.argv[1])
s=p.read_text()
start=s.index("   for book in ids:")
end=s.index("   # Separate context makes",start)
s=s[:start]+s[end:]
old="""    rp.locator('#skip').click();reading(rp,'L1')
    restore(rp,rr)"""
new="""    # Pause again after selection; drive actual requestAnimationFrame callbacks at
    # normal simulated frame intervals. The real-time full L1 return already passed.
    # A slow renderer must not cause a false timeout, nor may we skip return motion.
    rp.locator('#skip').click();reading(rp,'L1')
    rp.clock.pause_at(datetime.fromtimestamp((rp.evaluate('Date.now()')+1000)/1000,timezone.utc))
    rp.locator('#return-button').click()
    expect(rr).to_have_attribute('data-mode','returning')
    before=rp.evaluate('performance.now()')
    for step in range(20):
     rp.clock.run_for(1000)
     if rr.get_attribute('data-mode')=='idle':break
    assert rr.get_attribute('data-mode')=='idle',{'virtual_ms':rp.evaluate('performance.now()')-before,'visibility':rp.evaluate('document.visibilityState'),'mode':rr.get_attribute('data-mode')}
    expect(rp.locator('#reader')).not_to_be_visible()
    expect(rp.locator('[data-book]')).to_have_count(11)
    print('PASS actual animated rapid-selection return (virtual frame clock)',rp.evaluate('performance.now()')-before,flush=True)
    rp.clock.resume()"""
assert s.count(old)==1
s=s.replace(old,new)
# Restore focus after the secondary context, and retain real fullscreen/touch checks.
s=s.replace("   finally:rapid_ctx.close()","   finally:rapid_ctx.close()\n   page.bring_to_front()")
# Repeat the original dedicated skip R2 case; the failed run got past it but this
# verifies it independently with the unmocked page and reduced-motion restoration.
anchor="   page.get_by_role('button',name='全屏查看',exact=True).click()"
assert s.count(anchor)==1
s=s.replace(anchor,"   page.emulate_media(reduced_motion='no-preference')\n   shelf(page,'R2').click();expect(room).to_have_attribute('data-mode','summoning');page.locator('#skip').click();reading(page,'R2');restore(page,room);print('PASS independent R2 skip and real-time return',flush=True)\n   page.emulate_media(reduced_motion='reduce')\n"+anchor)
compile(s,str(p),'exec')
p.write_text(s)
