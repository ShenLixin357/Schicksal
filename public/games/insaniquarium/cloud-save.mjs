import { validateSave } from "./file-bridge.mjs";

export class CloudSave {
  constructor(member, { fetcher = fetch, storage = localStorage, onStatus = () => {} } = {}) {
    this.member = member; this.fetcher = fetcher; this.storage = storage; this.onStatus = onStatus;
    this.key = `schicksal:insaniquarium:${member}:v1`;
    this.revision = 0; this.pending = null; this.running = null; this.conflict = false; this.locked = false; this.acknowledged = ""; this.backupSucceeded = true;
  }
  readBackup() {
    try {
      const value = JSON.parse(this.storage.getItem(this.key));
      return value && Number.isSafeInteger(value.baseRevision) && value.baseRevision >= 0 && validateSave(value.state) ? value : null;
    } catch { return null; }
  }
  backup(state, dirty) {
    try { this.storage.setItem(this.key, JSON.stringify({ state, dirty, baseRevision: this.revision })); this.backupSucceeded = true; }
    catch { this.backupSucceeded = false; this.onStatus("storage", "本机备份空间不足，请立即导出存档。"); }
  }
  async request(method, body) {
    return this.fetcher("/api/insaniquarium-save", { method, credentials: "same-origin", cache: "no-store",
      headers: { "x-schicksal-member": this.member, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }
  async load() {
    const local = this.readBackup();
    let cloud;
    try {
      const response = await this.request("GET");
      if (response.status === 401 || response.status === 409) { this.locked = true; throw new Error("登录身份已变更，请重新进入游戏。"); }
      if (!response.ok) throw new Error("云端暂不可用。");
      cloud = await response.json();
      if (!Number.isSafeInteger(cloud.revision) || cloud.revision < 0 || (cloud.state !== null && !validateSave(cloud.state))) throw new Error("云端存档格式无效。");
    } catch (error) {
      if (this.locked || !local) throw error;
      this.revision = local.baseRevision;
      if (local.dirty) this.pending = local.state;
      this.onStatus("offline", "正在使用本机备份；联网后会尝试同步。");
      return local.state;
    }
    this.revision = cloud.revision;
    if (local?.dirty) {
      this.pending = local.state;
      if (local.baseRevision !== cloud.revision) {
        this.conflict = true;
        this.onStatus("conflict", "另一台设备已有新存档。请先导出本机备份，再读取云端。");
        return null;
      }
      this.onStatus("pending", "已恢复上次未上传的本机进度。");
      return local.state;
    }
    if (cloud.state) {
      this.acknowledged = JSON.stringify(cloud.state);
      this.backup(cloud.state, false);
    }
    this.onStatus("ready", cloud.state ? "已读取你的云端存档。" : "已准备好开始新游戏。");
    return cloud.state;
  }
  save(state) {
    if (!validateSave(state)) throw new Error("存档格式无效，请导出原文件备份。");
    if (this.locked) return Promise.resolve();
    if (JSON.stringify(state) === this.acknowledged && !this.pending) return Promise.resolve();
    this.pending = structuredClone(state);
    this.backup(this.pending, true);
    return this.flush();
  }
  flush() {
    if (this.conflict || this.locked) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.drain().finally(() => { this.running = null; });
    return this.running;
  }
  async drain() {
    while (this.pending && !this.conflict && !this.locked) {
      const state = this.pending;
      this.onStatus("saving", "正在同步存档…");
      try {
        const response = await this.request("PUT", { revision: this.revision, state });
        const result = await response.json();
        if (response.status === 409 && result.conflict) {
          this.conflict = true;
          this.onStatus("conflict", result.error);
          return;
        }
        if (response.status === 401 || response.status === 409) {
          this.locked = true;
          this.onStatus("locked", "登录身份已变更。请导出备份，再重新进入游戏。");
          return;
        }
        if (!response.ok || result.revision !== this.revision + 1) throw new Error(result.error || "上传未确认。");
        this.revision = result.revision;
        this.acknowledged = JSON.stringify(state);
        if (JSON.stringify(this.pending) === this.acknowledged) this.pending = null;
        this.backup(this.pending || state, Boolean(this.pending));
        if (!this.pending) this.onStatus("saved", "已同步至云端，可以换设备继续。");
      } catch {
        this.onStatus("offline", this.backupSucceeded ? "尚未上传，进度已保存在本机。联网后会重试，也可导出备份。" : "上传和本机备份均未成功，请立即导出存档。");
        return;
      }
    }
  }
}
