import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";

const root = "https://schicksal-ui-preview.m17686100216.workers.dev";
const expectedSha = process.env.GITHUB_SHA;
const password = JSON.parse(process.env.SCHICKSAL_PREVIEW_PASSWORDS ?? "{}").amberina;
assert.match(expectedSha ?? "", /^[a-f0-9]{40}$/);
assert.ok(typeof password === "string" && password.length >= 12, "Missing preview-only password");
console.log("::add-mask::" + password);
const results = [];

async function verifyVersion(page) {
  const response = await page.request.get(root + "/api/preview-version");
  assert.equal(response.status(), 200, "Preview version access failed");
  const version = await response.json();
  assert.equal(version.preview, true);
  assert.equal(version.sourceSha, expectedSha, "Wrong preview source commit");
}

async function checkBrowser(engine, label, reducedMotion) {
  const browser = await engine.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  let releaseArt = () => {};
  let signedIn = false;
  try {
    const entry = await page.goto(root, { waitUntil: "domcontentloaded" });
    assert.equal(entry.status(), 401, "Private site must present anonymous entry");
    if (reducedMotion === "no-preference") {
      await page.locator("#skip").click();
      await page.locator("#login").waitFor({ state: "visible" });
      await page.locator("#replay").click();
      await page.locator("#skip").click();
    }
    await page.locator("#login").waitFor({ state: "visible" });
    assert.equal(await page.locator("#opening").isVisible(), false, "Opening did not finish");
    await page.locator("#identity-amberina").click();
    await page.locator("#password").fill(password);
    await page.locator("#entry button[type=submit]").click();
    signedIn = true;
    // The gate wrapper has no intrinsic height: its fixed-position dialog is the visible UI.
    await page.locator(".mandatory-briefing-gate").waitFor({ state: "attached", timeout: 45_000 });
    await page.getByRole("dialog", { name: "帝国简报" }).waitFor({ state: "visible", timeout: 45_000 });
    assert.equal(await page.locator("#imperial-sidebar").count(), 0, "Mandatory briefing must precede shell mount");
    await verifyVersion(page);
    await page.getByRole("button", { name: "关闭帝国简报，返回天命首页" }).click();
    await page.locator("#imperial-sidebar").waitFor({ state: "visible" });
    if (reducedMotion === "no-preference") {
      const artHold = new Promise(resolve => { releaseArt = resolve; });
      await page.route("**/committee-lounge-word-globe-v1.png", async route => { await artHold; await route.continue(); });
      await page.locator(".imperial-logo-trigger").click();
      const passage = page.locator(".lounge-passage");
      await passage.waitFor({ state: "visible" });
      await passage.click({ force: true });
      await page.locator(".lounge-passage-waiting").waitFor({ state: "visible" });
      assert.equal(await page.locator(".club-room-stage").count(), 0, "Destination mounted before its art was ready");
      await passage.click({ force: true });
      releaseArt();
    } else {
      await page.locator(".imperial-logo-trigger").click();
    }
    await page.locator(".club-room-stage").waitFor({ state: "visible", timeout: 30_000 });
    await page.locator(".lounge-passage").waitFor({ state: "detached" });
    await page.getByRole("button", { name: /返回帝国/ }).click();
    if (reducedMotion === "no-preference") {
      await page.locator(".lounge-passage").click({ force: true });
    }
    await page.locator(".club-room-stage").waitFor({ state: "detached" });
    await page.locator(".lounge-passage").waitFor({ state: "detached" });
    assert.equal(await page.locator(".mandatory-briefing-gate").count(), 0, "Lounge return must not restart login");
    await page.locator('button[title="帝国政务"]').click();
    await page.getByText("Order Paper · 议事清单", { exact: true }).waitFor({ state: "visible" });
    const history = await page.request.get(root + "/api/parliament?scope=documents&itemId=lesson-1-state");
    assert.equal(history.status(), 200);
    assert.match(history.headers()["cache-control"], /no-store/);
    const payload = await history.json();
    assert.ok(Array.isArray(payload.documents) && payload.documents.length > 0, "Preview proposal history missing");
    const version = payload.documents[0].version;
    const document = await page.request.get(root + "/api/parliament?scope=documents&itemId=lesson-1-state&version=" + version);
    assert.equal(document.status(), 200);
    assert.equal((await document.json()).document.version, version);
    await verifyVersion(page);
    results.push(label);
    console.log("PASS " + label + ": opening, mandatory briefing, Lounge enter/exit, Parliament and read-only history");
  } finally {
    releaseArt();
    if (signedIn) {
      const logout = await page.request.delete(root + "/api/member-session", { headers: { Origin: root } });
      assert.ok(logout.ok(), "Preview test session could not be revoked");
    }
    await context.close();
    await browser.close();
  }
}
await checkBrowser(chromium, "Chromium normal motion / slow image", "no-preference");
await checkBrowser(webkit, "WebKit normal motion / slow image", "no-preference");
await checkBrowser(chromium, "Chromium reduced motion", "reduce");
assert.equal(results.length, 3);
console.log("Browser acceptance passed on exact preview SHA " + expectedSha);
