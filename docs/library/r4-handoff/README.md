> **R4 最新版（主站已准备好）：先阅读 [docs/ROUND4.md](docs/ROUND4.md)。** 当前基线 e31fe637…；新增档案馆、触屏、全屏和卸载修复及主站真实浏览器脚本。真实主站完整构建与浏览器验收仍未通过执行环境门槛。以下 R3/R2/R1 说明为历史记录。

> **第三轮最新版：先阅读 [docs/ROUND3.md](docs/ROUND3.md)。** 最新基线 f9b9fe8…，26组本地代码/权限测试、1,278帧原生绘制通过；真实主站构建、浏览器 E2E 仍阻塞。以下内容为前轮历史说明，以 ROUND3 为准。

> **第二轮更新：** 请先阅读 [docs/ROUND2.md](docs/ROUND2.md)。本地原生 Canvas 测试已通过；下文为第一轮历史记录，浏览器及主站整合仍未完成。

# Schicksal Library · 本地接入候选 2026-11-27

**状态：部分完成 / 尚未应用真实主站 / NO-GO for production。** 本包是实际代码增量，不是完整主站、线上预览或已经通过全站测试的 PR。原交接包仍是 129 图层、原始素材、独立站和艺术历史的完整保全来源，请不要删除。

## 基线及保全
- 主站 GitHub `main`: `89169ae7777586ecdb8991a0c017b357338de520`（本次 GitHub 只读检查）。
- 独立 Library Lab 交接基线 `137c8b4a68b8958212c89c5d83b57e7b1e27056d`。
- 输入 tar.gz SHA-256 `82f51c0e87e6a669085087fd4bb2755603f26565bf9b013bb706dfdda68d42bd`。
- `routes.js` SHA-256 `8660ae65f1109f766c38cb5bff0d7f476e514ed3d8f3b656288a439a68afb79e`，与交接包原字节完全一致。
- GitHub 在检查时公开；本地 Git clone 因 DNS/网络不可用失败。因此没有建立远端分支、没有提交/推送新私人内容，也没有对原主站执行实际 build。不得把此候选称为已经接入正式站。

## 已编写内容
- `overlay/app/library/contracts.ts`：BookDocument / ShelfSlot / AnimationProfile / BookBinding / CatalogPort / AssetPort。
- `overlay/public/library/library/catalog/documents.js`：11 本书，10 本占位书，正式 AVS 7 章，绑定关系与目录/全文检索。
- `overlay/public/archives/`：七篇原始 Markdown；前三份与主站已有 Git blob 匹配；后四份新增。`library/data/nation-building.json` 是交接包的派生检索块，带源正文 SHA-256，非第二份可编辑书稿。后续正文编辑时须重新生成索引并验收；本阶段没有实现通用重编译器。`app/library/archive-chapters.json` 是同一正文的目录元数据。
- `overlay/public/library/library/catalog/scene-host.js` + `mount.js`：尝试将完整场景与原调试器 multiTrack 绘制逻辑、目录/阅读器组合，统一书籍召唤与归位状态；采用 Shadow DOM 隔离样式，保留原引擎与遮挡函数；适配资产 URL 与卸载。新增基本梯子/旗帜/灯光控件。原独立调试器及图层库存完整留在原始交接包中；本地候选尚未逐项达到原调试器所有控件（例如轨迹引导、逐帧时间轴、旗帜长按、全屏及换标志等）的验收。
- `overlay/app/library/library-section.tsx`：React 原生容器，不使用 iframe；按需加载静态 ESM。
- `overlay/app/api/library/debug/route.ts`：拟复用主站现有 `requireTechnologyMinister`；科技部有本地草稿即时预览、恢复定稿、JSON 导入/导出，普通正式运行不读取草稿；无数据库写入、无发布接口。权限路由仅编写，尚未在真实 Worker/主站会话中验证。静态 JS 可被登录用户获取，不作为保密手段，服务端端点才是权限边界。
- `docs/runtime-assets.json`：58 个第一轮运行素材约 7.56 MiB，逐一记录哈希与长度；没有将 129 层源资产、ORA/ZIP、原始设计历史全量复制到生产。动态依赖是否完整仍需真实浏览器网络验证。
- `apply-local.py`：精确基线、干净工作树、现有文件无差异/锚点完整前置检查，创建本地 `feature/library-integration-20261127` 分支并写入 overlay，最小改动主站 3 个挂载点（page、archives、technology）。不会提交、push、部署或修改数据库；遇到基线变化拒绝执行。脚本尚未对真实主站运行。另一个开发者更新 main 后，应重新审核集成点而不是强制覆盖。

## 验证结果
`node --experimental-default-type=module --test tests/library-data.test.mjs` — **16/16 PASS**。书位和动画绑定、占位书搜索、课稿哈希/稳定段落 ID、锁定参数、340ms 单双击竞争、十一书轨迹采样、运行素材哈希。Node 数值测试中的书位几何复用交接包的坐标，并非截图比对。

所有候选 JS 执行 `node --check`，脚本 Python 语法检查通过。尝试使用 Chromium 访问本地 HTTP 预览及 Playwright 路由夹具，两次均 `net::ERR_BLOCKED_BY_ADMINISTRATOR`，未能渲染；Chrome/Safari/WebKit E2E、逐段遮挡、触屏、真实登录和部长权限、主站全站构建/回归、部署均未执行。不能宣称已经通过。原配置数值无需重调，视觉适配问题应通过宿主渲染与生命周期修正。

## 接续方式（仅在安全开发环境内）
1. 保留原始 tar.gz。确认仓库已私有、或仅本地操作，且最新主站基线与本包一致；若 main 更新，先检查差异，重新适配锚点。
2. `python3 apply-local.py /path/to/Schicksal`（需要本地真实主站 clone；不要将包直接解压覆盖主站）。
3. 在新分支执行项目规定 `npm ci`、构建、全站 tests、架构门禁、成员权限及 Safari/Chrome 浏览器回归。先检查实际 JS ESM 静态资源请求路径和主站 Worker 路由兼容；验证 `BookBinding`、原书位空洞复位、每本书封皮、灯光及遮挡。
4. `local-preview/preview-local.html` 可仅用于本地临时目录：把它复制到临时 `overlay/public/library/`，用本地 HTTP server 打开 `/library/preview-local.html`。该文件不在正式 overlay 中，不应部署。需要真正浏览器进行测试，不提供公共网址。
5. 完成测试后记录候选 SHA、修改清单、测试证据；与另一条主站开发线在独立整合分支合流。未经明确批准不得合并 main、创建 R2、改生产 D1 或部署生产。

## 下一阶段约束
BookDocument、ShelfSlot、AnimationProfile、BookBinding 分离。现有轨迹基于绝对坐标并绑定遮挡层；当前兼容性校验只允许已经定稿的一对一书位/动画，未来互换、增加书位需验证几何兼容。保持图库和文件存储适配器独立，不建生产数据库，不开 R2。以后实现 D1 书籍修订、参数发布、R2 原稿/派生图、SHA-256 去重、引用关系、回收和备份。现有 Supabase 家庭影像馆不迁移。
