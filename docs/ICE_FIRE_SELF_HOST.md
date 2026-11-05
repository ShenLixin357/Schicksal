# 森林冰火人：独立同站运行（试验分支）

## 当前状态
- Lounge 墙面 🔥❄️ 摆件链接到 `/games/fireboy-watergirl`。
- 六代选关页面不会加载主站的 3D Lounge。
- 游戏页面从同源 `/games/{1-forest-temple,...}/index.html` 加载静态资源。
- 不再依赖 `waterfire.p.wyf9.top` 的实时可访问性。
- **游戏资源不包含在本提交中**：运行 `npm run build:with-ice-fire` 时从指定版本的上游仓库导入。
- 保留独立游戏试作页 `/games/ice-fire`；它与正式 HTML5 资源相互独立。
- 远程双人联网模式尚未制作；本地双人模式由原网页游戏提供。

## 在正常可联网环境验证
要求 Node 22+、Git，以及有访问 `github.com` 的网络。

```bash
npm ci
npm run game:import
npm run build
```

或直接：
```bash
npm run build:with-ice-fire
```

导入脚本：
1. 克隆 wyf9 仓库到临时目录；
2. 检查固定上游 SHA（`f255e5f74f695528d431d96aa8cf5181e88557f0`），发生变化时停止；
3. 把共享图片/音效恢复到各游戏文件夹；
4. 删除 Service Worker 注册脚本和共享资源代理；
5. 复制到 `public/games/`，写入 `ice-fire-import.json` 清单；
6. 用 `vinext build` 输出供 Cloudflare 上传的游戏资产。

若克隆或复制失败，部署应视为失败，**不要把只存在选择页面、没有游戏资源的构建版本发布到线上**。

## Cloudflare
当确认来源、许可、实际游戏运行与会员访问保护后，在 Cloudflare 工程构建设置中把原 `npm run build` 改成 `npm run build:with-ice-fire`，部署命令仍使用 `npm run deploy`。CI 环境应能运行 Git。

该项目的 `SCHICKSAL_HOSTING=cloudflare` 验证应继续覆盖游戏 HTML、JS、JSON、图片和音效。不要单独发布到公开 Pages 或可匿名下载的存储桶。注意：私有仓库不等于发布的网页资源自动私有。

## 必测清单
- 未登录浏览器直开 `/games/1-forest-temple/index.html` 应返回登录页而非游戏文件。
- 已登录用户可查看六代列表，每代的游戏 HTML、JS、图片、音效、地图均不出现 404。
- Safari 的同键盘控制、暂停/重来、关卡切换、音效、全屏。
- 点击墙面双人摆件可进入页面，返回天命后议会、会话、照片、纸牌和 Lounge 正常。
- iPhone / Mac 页面不溢出、墙面入口不覆盖其他可交互组件。
- 不出现游戏的 Service Worker 拦截天命其他页面。
- 对未经明确授权的第三方代码、关卡、美术和音乐，应确认再分发使用权后再进行网站托管。

## 重要限制
当前容器 DNS 无法解析 GitHub，故只验证了导入算法在模拟资源树上的行为，尚未下载上游真实二进制资源，**尚未跑真实游戏/构建/Cloudflare 部署**。
