import assert from "node:assert/strict";
import test from "node:test";
import { privateLoginResponse } from "../app/private-login.ts";
test("anonymous entry renders the original design without private app chunks", async () => {
  const response = privateLoginResponse(true);
  assert.equal(response.status, 401);
  assert.match(response.headers.get("content-type"), /^text\/html/);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.match(response.headers.get("content-security-policy"), /default-src 'none'/);
  const html = await response.text();
  assert.match(html, /天命第一帝国/);
  assert.match(html, /id="opening"/);
  assert.match(html, /id="login"/);
  assert.doesNotMatch(html, /codex-preview|<script[^>]+src=|\/assets\/page-/);
});
test("entry fails closed when unavailable and HEAD has no body", async () => {
  assert.equal(privateLoginResponse(false).status, 503);
  assert.equal(privateLoginResponse(true, "GET", true).status, 503);
  const head = privateLoginResponse(true, "HEAD");
  assert.equal(head.status, 401);
  assert.equal(await head.text(), "");
});
