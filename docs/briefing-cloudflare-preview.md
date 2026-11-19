# 帝国简报 V2.6：真实 React 页面独立 Cloudflare 预览

本流程用于把 PR #5 中的**真实网站 React 组件**部署到一个隔离的 Cloudflare Worker，供用户验收。它不是离线 HTML 示意图，也不是生产环境迁移。

## 安全边界（强制）

- PR #4 / #5 **不需要合并**，预览取分支 `feature/briefing-v2-shell-20261118`。
- 预览 Worker 固定名称为 `schicksal-briefing-preview`，不是 `schicksal`。
- **必须新建空 D1** `schicksal-briefing-preview-db`，且预览 UUID 必须不同于生产 `schicksal-db` UUID。预览不得绑定生产 D1，不导入任何成员聊天、投票、照片、登录记录、游戏存档。
- **禁止运行 `npm run deploy`**：旧脚本会自动分配数据库并迁移。只能使用下方经过人工核验的单独 `wrangler --config work/briefing-preview-dist/server/wrangler.json`。
- 不使用任何生产 Supabase Secret / R2 / 生产账户密码。预览的照片上传功能默认不配置；仅用于简报和主站界面的交互验证。
- 预览部署中的 D1 操作只允许作用于新建的空测试数据库。绝对不能迁移/清理/覆盖生产数据库。
- 预览的 `SCHICKSAL_MEMBER_PASSWORDS` 要使用**全新的测试密码**，只在 Cloudflare 预览 Worker 的 Secret 设置中配置；不写入 GitHub、代码、命令参数或聊天。
- 预览测试后按需删除预览 Worker、D1 测试数据库和测试密码。

## 需要的账号权限

操作者须登录用户自己的 Cloudflare 账户，拥有 Workers 与 D1 管理权限。当前 GitHub 连接**不等同于 Cloudflare 登录**。如果通过 ChatGPT Work 操作，必须由用户本人登录 Cloudflare；不要向聊天发送 Token/密码。

## 实际操作

1. 在 Cloudflare 控制台检查现有 Worker `schicksal` 及生产 D1 `schicksal-db` 的 **database ID**（只读），记录其 UUID 用于防混淆，禁止改变现有生产 Worker。
2. 新建一个完全空的 D1，**名称严格为** `schicksal-briefing-preview-db`。从页面读取新数据库 UUID；检查与生产 UUID 不同。
3. 检出本仓库 PR #5 分支并构建：
   ```bash
   git checkout feature/briefing-v2-shell-20261118
   npm ci
   npm run build
   ```
4. 在 Git 忽略的 `work/briefing-preview-target.json` 中建立以下文件；填写控制台显示的真实 ID，**不填任何 Secret**：
   ```json
   {
     "accountId": "<Cloudflare account ID: 32 hex>",
     "previewDatabaseId": "<new preview D1 UUID>",
     "productionDatabaseId": "<existing production D1 UUID>",
     "previewDatabaseName": "schicksal-briefing-preview-db"
   }
   ```
5. 运行只生成本地文件的安全准备命令：
   ```bash
   node scripts/cloudflare/prepare-briefing-preview.mjs work/briefing-preview-target.json
   ```
   会写入 `work/briefing-preview-dist/server/wrangler.json`，不连接 Cloudflare、不迁移、不部署。准备脚本强制拒绝预览 D1 ID 与生产 D1 ID 相等、拒绝错名字与 Secret 字段。
6. **再次核对**生成的配置：`name` 应为 `schicksal-briefing-preview`，唯一 `DB` 绑定 ID 是新建 D1 的 UUID，`assets.directory` 是 `../client`，没有 Supabase/R2 生产绑定。可通过 `npx wrangler d1 list --json` 对照 Cloudflare 真正的数据库名称和 UUID。若不符则停止。
7. 先做打包验证：
   ```bash
   npx wrangler deploy --dry-run --config work/briefing-preview-dist/server/wrangler.json
   ```
   成功后只对**隔离预览 D1**执行仓库现有 SQL 迁移：
   ```bash
   npx wrangler d1 migrations apply DB --remote --config work/briefing-preview-dist/server/wrangler.json
   ```
   再部署**独立 Worker**：
   ```bash
   npx wrangler deploy --config work/briefing-preview-dist/server/wrangler.json
   ```
   **不要运行 `npm run deploy`、`npm run db:migrate` 或覆盖默认 `wrangler.json`。**
8. 将全新测试登录密码设置为 Worker `schicksal-briefing-preview` 自己的 Secret：`SCHICKSAL_MEMBER_PASSWORDS`。可在 Cloudflare 控制台设置，不要在聊天里传递密码。只需要为测试成员 `amberina` 配置一次。预览 Worker 未设置登录 Secret 时不应允许进入私密网站内容。
9. 从 Wrangler/Cloudflare 的真实部署回执复制预览地址，不猜测 `workers.dev` 子域名。打开地址，测试：
   - 未登录用户无法读取私密内容及带凭证 API；
   - 输入预览专用密码登录，首次自动出现 V2.6 简报，顶部和头条均调用主站扁平八色 `Emblem compact`；
   - 奶白底色、浅色椭圆、八色细波浪、卡片晕染在 1440px 桌面与 390px 手机正确；
   - 关闭简报、进入左侧第二项「帝国简报台」，展开/收起全部 Daily News；
   - 议会投票待办来自新建测试 D1；没有记录时显示明确空状态，不能借用生产任务；
   - 未读消息尚未连接 Messenger 时保持简洁占位，不要虚构消息；
   - 公投定位议会公投分类、游戏入口进 Lounge 游艺室（仅对获准账号）；
   - 新旧登录会话、退出登录、旧 Lounge、小游戏能正常使用，测试记录仅产生在预览 D1。
10. 验收完成后记录：**预览网址、对应 Git commit、预览 D1 UUID、数据库迁移结果、登录与手机验收结果**。如果审美或功能需要修复，只修改 PR #5 并重新部署预览。不得因此自动合并主分支。

## 注意

当前的离线 HTML 预览只能代表视觉方案；不能替代真实 React / Worker 浏览器验收。此文档和准备脚本不会产生真实预览网址：它仍要求经过授权的 Cloudflare 操作和实际成功部署。部署回执产生前不得声明「已上线」。

如果先把 PR #4 部署生产，它的迁移需要**另行**执行生产备份、校验和隔离恢复演练。这与本次隔离预览完全不同，不能复用预览的空 D1 当作生产恢复验证。


## 预览首次部署申请

- 2026-11-19：用户已在 Cloudflare 账户创建受限 API Token，并确认已将三个预览专用 Secrets 添加到 GitHub Repository Secrets。
- 本提交仅请求执行独立 Worker `schicksal-briefing-preview` 的首次部署；任何身份核验、Cloudflare 资源检查或 D1 隔离检查失败都必须中止。
- 不合并任何 PR，不更新生产 Worker，不连接生产 D1。

## 2026-11-19：V3 议会分类修复预览更新

- 按 `docs/briefing-classification-v3.md`，将开放提案、议长选举报名/投票、正式辩论和议案/公投表决归入「我的政务」。
- Daily News 仅保留已结束的公共结果、既有国家纪事与功能公告，不显示正在进行的投票。
- 议长选举的真实 DDL 与每秒更新的倒计时优先出现在三项政务预览；预期日期明确不冒充硬截止。
- 修正政务卡深链，点击前往对应提案、议长选举、议场或表决区域。
- 此次更新仅部署既有隔离预览 Worker + D1，用户授权的预览密码保持使用原 Secrets；不涉及生产环境。

## 2026-11-19 · V3.2 独立预览：四分类收件箱与真实在线状态

- 根据 `docs/briefing-classification-v3.md` 第 6–7 节，加入完整的四分类政务收件箱、30 天参与、真实截止未参与、个人归档及撤销。
- 政务高亮统一为重要红、真实强制 DDL 48 小时内黄、其他白，普通未投票仅文字提示。
- 归档箱保留与待处理区相同的卡片、DDL、倒计时及进入议案链接；独立成员私有归档，不写议会选票。
- 会话心跳每 30 秒、可见窗口 90 秒，真实显示在线人数与成员名；仅经验证的已登录会员可访问。
- 不更改已冻结的 V2.6 徽记、插画或视觉背景，不合并 main，不部署生产 Worker/D1。
- 本次通过 CI 后重新发布**原隔离预览**（Worker `schicksal-briefing-preview`，D1 `schicksal-briefing-preview-db`），使用既有预览密码 Secret。

### 2026-11-19 · Isolated preview sync diagnostic

User browser showed successful member heartbeat but `/api/briefing` 503. Trigger isolated D1 schema diagnostics and authenticated HTTP smoke check on the **preview** environment only. Do not touch production or merge main.

### 2026-11-19 · Briefing sync cold-start hardening

Verified the actual isolated Cloudflare D1 schema and a signed-in HTTP request: `GET /api/briefing` responded HTTP 200 with 3 current pending affairs; user-visible initial 503 remains an intermittent first-load behavior to harden. Changes: memoize preview-only schema creation across simultaneous presence/briefing requests, retry transient client GET failures at 2s/5s/10s, regression test simultaneous first-login heartbeat and inbox load. Preview smoke test now must succeed on the deployed Worker before declaring it ready.


### 2026-11-19 · Official Amberina Simple emblem and priority-banner preview

- QA-only: the existing proposal titled 国家基础制度框架案 is marked important (red) in the personal affairs UI without mutating parliament data or legal deadlines.
- Red important cards read 🚨 重要提醒; yellow cards with a real enforceable deadline within 48 hours read ⏰ 紧急. Ordinary and merely expected dates keep neutral wording.
- Amberina's personal identity mark uses the exact unchanged Simple_FINAL PNG supplied in AvS_Personal_Emblems_Package.zip; official mark color is #F3ED87. The decorative Parhelia edition is not used. The empire's shared eight-color emblem stays unchanged.
- Redeploy ONLY the pre-existing isolated Worker schicksal-briefing-preview and its distinct preview D1. No production Worker, D1, migrations or secrets may be touched. Confirm live preview HTTP smoke checks before acceptance.


### 2026-11-19 · Re-read official Procreate Simple and preserve old circular UI

- Source is the newly uploaded `AvS_Final_Procreate_Only(1).zip`, explicitly the official `Simple/AvS_Personal_Emblem_Simple_FINAL.procreate`.
- Replace earlier incorrectly oriented PNG with the crop of the Procreate document's own transparent `QuickLook/Thumbnail.png`: 944×1024 source, cropped 100,128–900,928 to 800×800, **without** rotation or recoloring. Source and artifact details are in `docs/amberina-simple-web-asset.md`.
- Restore the original `CitizenMark` outer ring, inner ring, and snow-style peripheral accents in locations that already used CitizenMark; do not decorate unrelated art or the shared eight-color emblem.
- Retain the current sidebar-only actual-online `SidebarPresence` UI and click-to-public-profile behavior; no names, numbers, extra green dots, or topbar online strip.
- Deploy strictly the existing isolated `schicksal-briefing-preview` Worker and its **separate** `schicksal-briefing-preview-db`. Do not update or access production D1, Worker or secrets. Perform the existing authenticated preview HTTP smoke tests.

### 2026-11-19 · Amberina web-color 35.7% and ring/dot hue unification

- User explicitly chose 35.7% between official `#F3ED87` and suggested `#F0DD7B`; web-only output: `#F2E783`.
- Only the Amberina Simple derived web PNG and `CITIZENS.amberina.markColor` change; the other member colours, Procreate masters and shared eight-blade emblem remain intact.
- Synchronize already-existing CitizenMark inner/outer circles and President office halo/dots via `--mark`, removing fixed orange from leader halo and blue from Amberina's archive book/reader outer circular badges. Do not add any circles/dots where previously absent.
- Deploy exclusively existing isolated preview Worker `schicksal-briefing-preview` + distinct test D1 `schicksal-briefing-preview-db`. Do not touch production Worker/D1 or merge main. Confirm CI, logged-in `/api/briefing` and `/api/presence` smoke checks.

### 2026-11-19 · Login/identity 75.3% update and honors/meeting Speaker contrast

- User replaces 35.7% web glyph tint with 75.3%: `#F1E17E` between official `#F3ED87` and suggested `#F0DD7B`.
- Official citizen representative colour remains `#F3ED87` for non-glyph UI including Honors & Scoreboard member row and other representative accents, not uniformly darkened across all backgrounds.
- Rename personal glyph URL to `/amberina-personal-simple-web753.png` to prevent reuse of browser-cached login artwork. Maintain Procreate original as `/amberina-personal-simple-official.png` and render meeting elected Speaker's badge in the *official* colour, including matching existing rings/President halo.
- Keep the shared eight-colour empire emblem, all other citizen colours, Procreate masters, and personal Profile layout unchanged. No invented new circles or status dots.
- Deploy **only** the existing isolated Worker `schicksal-briefing-preview` / preview-only D1 with existing dedicated credentials. No production Worker, production D1, or main merge. Check 75.3% artwork, authenticated briefing/presence and preview screenshot manually.
