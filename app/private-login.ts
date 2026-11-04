/** A self-contained entry screen; it loads no private scripts, artwork or member list. */
export function privateLoginResponse(configured: boolean, method = "GET", unavailable = false) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const message = unavailable ? "入口暂时无法验证身份，请稍后重试。" : configured ? "输入你收到的成员账号和密码。" : "成员入口尚未启用，请联系站长。";
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Schicksal · 成员入口</title>
<style nonce="${nonce}">
:root{color-scheme:dark;font-family:Georgia,"Noto Serif SC",serif;background:#11101a;color:#f1eee5}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 10%,#29243c,transparent 65%)}main{width:min(100%,410px);padding:42px 32px;border:1px solid #cdb57a40;border-radius:18px;background:#17151fcc;box-shadow:0 24px 80px #0005}small{color:#cdb57a;font:11px system-ui,sans-serif;letter-spacing:.24em}h1{font-weight:400;font-size:34px;margin:16px 0}p{color:#bdb8ca;line-height:1.8;font:14px/1.8 system-ui,sans-serif}label{display:block;margin:22px 0 8px;font:13px system-ui,sans-serif;color:#ddd7e8}input,button{width:100%;min-height:46px;border-radius:7px;font:15px system-ui,sans-serif}input{padding:10px 12px;background:#0e0d14;border:1px solid #57505e;color:#fff}input:focus{outline:2px solid #cdb57a;outline-offset:2px}button{margin-top:26px;border:0;background:#d5bf88;color:#18131b;cursor:pointer}button:disabled{opacity:.5;cursor:wait}#status{min-height:24px;color:#dbc7ad;margin-bottom:0}.note{margin-top:26px;font-size:12px;color:#8e889b}
</style></head><body><main><small>PRIVATE SPACE</small><h1>Schicksal</h1><p>此空间仅向受邀成员开放。<br>${message}</p>
<form id="entry"><label for="member">成员账号</label><input id="member" name="member" autocomplete="username" maxlength="40" required spellcheck="false" autocapitalize="none"><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required><button type="submit"${!configured || unavailable ? " disabled" : ""}>进入私密空间</button><p id="status" role="status" aria-live="polite"></p></form><p class="note">请使用邀请人单独提供的登录信息。</p></main>
<script nonce="${nonce}">
document.getElementById('entry').addEventListener('submit',async function(event){event.preventDefault();const button=this.querySelector('button'),status=document.getElementById('status');button.disabled=true;status.textContent='正在验证…';try{const response=await fetch('/api/member-session',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({citizenId:document.getElementById('member').value.trim().toLowerCase(),password:document.getElementById('password').value})});const data=await response.json();if(!response.ok)throw new Error(data.error||'登录暂时未能完成。');document.getElementById('password').value='';window.location.replace('/');}catch(error){status.textContent=error instanceof Error?error.message:'暂时无法连接成员入口。';button.disabled=false;}});
</script></body></html>`;
  return new Response(method === "HEAD" ? null : html, {
    status: !configured || unavailable ? 503 : 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Vary": "Cookie",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
      "Referrer-Policy": "no-referrer",
    },
  });
}

export function privateSiteResponse(response: Response, config: { SCHICKSAL_HOSTING?: string }) {
  if (config.SCHICKSAL_HOSTING !== "cloudflare") return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  const vary = headers.get("Vary");
  if (!vary?.split(",").some((value) => value.trim().toLowerCase() === "cookie")) headers.set("Vary", vary ? `${vary}, Cookie` : "Cookie");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
