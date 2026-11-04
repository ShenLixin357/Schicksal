# 天命独立站：免费部署步骤

当前默认路线：**Cloudflare Workers Free + D1 Free + Supabase Free Storage**。
不需要开通 R2。保持两个服务的 Free 计划；免费额度耗尽可能限制服务，免费计划不自动升级。
Supabase 免费项目可能在闲置一周后暂停，需要到控制台恢复。

## 1. 创建 Supabase 免费项目

1. 打开 https://supabase.com/dashboard ，可使用现有 GitHub 账号登录。
2. 创建组织，组织名可填 `Schicksal`，计划选择 **Free / $0**。
3. 创建项目：名称 `schicksal`，自行设置并保存数据库密码，区域选择 **Singapore**。
4. 等待项目首页显示就绪。此数据库密码不是网站成员密码，也不需要交给助手。

## 2. 创建私密照片存储桶

1. 项目左侧 **Storage → New bucket / Create bucket**。
2. 名称填写 **`schicksal-photos`**。
3. **Public bucket 保持关闭**，创建 Private 存储桶。
4. 不需要添加匿名读写政策：照片由 Cloudflare 服务端读取，访客仍须先登录天命。

免费存储额度为 1 GB，另有出站流量额度；以 Supabase 账户 Usage 页面为准。
网站现有限制为单张 12 MB，使用普通对象下载，不使用付费图片变换。

## 3. 将连接信息直接填入 Cloudflare

在 Supabase 的 **Connect** 对话框找到 Project URL；在 **Settings → API Keys → Secret keys** 创建或取得一个服务端密钥（`sb_secret_...`）。
不要使用 publishable key，也不要把真实密钥贴进聊天、截图或 GitHub。

Cloudflare：**Workers & Pages → schicksal → Settings → Variables and Secrets → Add**：

| 名称 | 类型 | 值 |
| --- | --- | --- |
| `SUPABASE_URL` | Secret | 此项目的 `https://……supabase.co` 根地址 |
| `SUPABASE_SECRET_KEY` | Secret | 此项目的服务端 `sb_secret_...` 密钥 |

代码默认使用 `schicksal-photos` 桶名。配置启用了 `keep_vars`，以后从 GitHub 部署时保留控制台变量；Secrets 也由 Cloudflare 保存。

成员登录还需要原迁移指南中的 `SCHICKSAL_MEMBER_PASSWORDS` Secret：包含 `amberina`、`zxy`、`truth`、`kaito`、`harry` 五个键，各对应一个不同且至少 12 字符的密码。密码由站长在 Cloudflare 私下设置。

## 4. 部署

使用仓库最新版 `main`，构建设置：

| 设置 | 值 |
| --- | --- |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Root directory | `/` |

此版本不创建或连接 R2。部署脚本复用已有 D1 数据库并应用尚未执行的表结构迁移。
在 Variables and Secrets 保存后再部署或重试，使配置生效。
若缺少 Supabase 配置，主站仍可部署，但照片接口会返回明确的未配置提示。

## 5. 恢复原数据和照片

数据备份单独保存，不在 GitHub 源码里。

- 将备份 `data.sql` 导入已经建好表且尚未写入应用记录的 D1；不要重复导入 `schema.sql`，也不要覆盖已有成员数据。
- 将备份 `objects/family-archive/` 里的照片上传到 `schicksal-photos` 的 **`family-archive` 文件夹**，保留完整原文件名。
- 例如原对象键为 `family-archive/<原照片编号>.png`，迁移后仍须是同一个键。
- 核对备份 manifest 中各表行数以及照片字节数、校验和；原导出为 313 条应用记录及一张照片。最终切换前核验旧站是否又有新数据。
- 完成成员登录、照片查看/上传/删除、聊天、议会权限和最好成绩榜验证后，才算迁移完成。

## 官方说明

- 免费费用和限制：https://supabase.com/docs/guides/platform/cost-control
- Supabase 免费配额与闲置暂停：https://supabase.com/pricing
- 私密存储桶：https://supabase.com/docs/guides/storage/buckets/fundamentals
- 服务端密钥：https://supabase.com/docs/guides/getting-started/api-keys
- D1 免费额度：https://developers.cloudflare.com/d1/platform/pricing/
