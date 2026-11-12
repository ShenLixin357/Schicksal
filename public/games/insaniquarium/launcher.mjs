import { CloudSave } from "./cloud-save.mjs";
import { collectSave, restoreSave, installAssets, validateSave } from "./file-bridge.mjs";
import { loadHostedAssets } from "./hosted-assets.mjs";

const $ = id => document.getElementById(id);
let engine = null, cloud = null, resources = null, initialSave = null, started = false, exportRequested = false, engineReady = false;
let loadingResources = false;
const status = (kind, message) => {
  $("status").dataset.kind = kind; $("status").textContent = message;
  if (kind === "conflict") { $("cloud").hidden = false; $("start").disabled = true; }
  if (kind === "locked") { $("save").disabled = true; $("start").disabled = true; }
};
function assetDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("schicksal-insaniquarium-resources", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("resources");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function resourceCache(hash, write) {
  const db = await assetDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("resources", write ? "readwrite" : "readonly");
      const store = tx.objectStore("resources"), key = `hosted:${hash}`, request = write ? store.put(write, key) : store.get(key);
      let result;
      request.onsuccess = () => { result = request.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function refreshStart() { $("start").disabled = !resources?.length || !cloud || cloud.conflict || cloud.locked || started; }
function download(state) {
  if (!validateSave(state)) return status("error", "尚无可以导出的存档。");
  const url = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url;
  a.download = `insaniquarium-${cloud.member}-${new Date().toISOString().replaceAll(":", "-")}.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function boot() {
  try {
    const response = await fetch("/api/member-session", { credentials: "same-origin", cache: "no-store" });
    const identity = await response.json();
    if (!response.ok || typeof identity.citizenId !== "string") throw new Error("请先登录天命成员身份，再进入水族馆。");
    cloud = new CloudSave(identity.citizenId, { onStatus: status });
    initialSave = await cloud.load();
    $("export").disabled = !initialSave && !cloud.readBackup();
    await loadResources();
  } catch (error) { status("error", error.message); }
}
async function loadResources() {
  if (started || loadingResources || !cloud || cloud.conflict || cloud.locked) return;
  loadingResources = true; $("retry").hidden = true;
  try {
    resources = await loadHostedAssets({
      readCache: hash => resourceCache(hash),
      writeCache: (hash, bytes) => resourceCache(hash, bytes),
      onProgress: message => { if (!cloud.conflict && !cloud.locked) status("loading", message); },
    });
    if (!cloud.conflict && !cloud.locked) status("ready", "游戏已就绪，点击开始游戏即可。");
  } catch (error) { status("error", error.message); $("retry").hidden = false; }
  finally { loadingResources = false; refreshStart(); }
}
$("retry").addEventListener("click", () => { void loadResources(); });
$("start").addEventListener("click", async () => {
  if (started || !resources || !cloud || cloud.conflict || cloud.locked) return;
  started = true; refreshStart(); $("retry").hidden = true; $("import").disabled = true;
  $("import-label").setAttribute("aria-disabled", "true");
  status("loading", "正在启动怪怪水族馆…");
  try {
    const { default: createGame } = await import("./engine/insaniquarium.mjs");
    engine = await createGame({
      canvas: $("canvas"), noInitialRun: true,
      locateFile: name => new URL(`./engine/${name}`, import.meta.url).href,
      print: () => {}, printErr: message => console.warn(message),
      onAbort: () => status("error", "游戏暂时无法继续，请保留或导出本机备份后重试。"),
      schicksalOnReady: () => {
        engineReady = true; $("save").disabled = false; $("export").disabled = false;
        status("playing", "游戏已启动。离开前请保存并等待同步完成。");
      },
      schicksalOnSave: () => {
        try {
          const state = collectSave(engine.FS);
          void cloud.save(state);
          if (exportRequested) { exportRequested = false; download(state); }
        } catch (error) { status("error", error.message); }
      },
    });
    installAssets(engine.FS, resources);
    engine.FS.mkdirTree("/saves");
    if (initialSave) restoreSave(engine.FS, initialSave);
    $("welcome").hidden = true; $("canvas").hidden = false; $("canvas").focus();
    engine.callMain([]);
    setInterval(() => { if (engineReady && !cloud.locked) engine._schicksal_request_save(); }, 10000);
    void cloud.flush();
  } catch (error) {
    console.error(error);
    status("error", "游戏程序未能启动，请刷新页面后重试。存档备份会保留。");
    // Asyncify/SDL instances cannot safely be started twice in the same document.
    $("start").textContent = "刷新后重试";
    $("start").disabled = false;
    $("start").addEventListener("click", () => location.reload(), { once: true });
  }
});
$("save").addEventListener("click", () => { if (engineReady) engine._schicksal_request_save(); });
$("export").addEventListener("click", () => {
  if (engineReady) { exportRequested = true; engine._schicksal_request_save(); }
  else download(cloud?.readBackup()?.state || initialSave);
});
$("import").addEventListener("change", async event => {
  if (started || !cloud || cloud.conflict || cloud.locked) return;
  try {
    const file = event.target.files[0];
    if (!file || file.size > 800000) throw new Error("存档文件过大。");
    const save = JSON.parse(await file.text());
    if (!validateSave(save)) throw new Error("这不是可识别的原版存档备份。");
    initialSave = save; $("export").disabled = false;
    status("ready", "已载入存档备份。开始游戏并保存后，将同步到当前成员。");
  } catch (error) { status("error", error.message); }
});
$("cloud").addEventListener("click", () => {
  const backup = cloud?.readBackup();
  if (!backup) return;
  download(backup.state);
  cloud.pending = null;
  try { cloud.storage.removeItem(cloud.key); location.reload(); }
  catch { status("error", "未能清理旧缓存，请保留导出的备份。"); }
});
window.addEventListener("online", () => { if (cloud) void cloud.flush(); if (!resources && !started) void loadResources(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && engineReady) engine._schicksal_request_save(); });
window.addEventListener("beforeunload", event => {
  if (cloud?.pending) { event.preventDefault(); event.returnValue = ""; }
});
void boot();
