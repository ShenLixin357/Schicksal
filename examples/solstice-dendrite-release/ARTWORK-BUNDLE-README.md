# Solstice Dendrite · Bruma｜最终美术与动画整合包

版本：2026-11-20。四幅图片采用用户本次确认的终稿，打包过程不得重新绘制、调色、缩放或改变 PNG 原始字节。

## 一、文件目录

| 文件 | 用途 | 原始来源 |
| --- | --- | --- |
| `Card_Front.png` | 新牌面：六棱镂空冰晶 + 空白标题匾 | `image(20261119-044122).png` |
| `Card_Back.png` | 新牌背：大型六棱冰晶，降临阶段两面均使用 | `Card_Back.png` |
| `Flower_Bruma.png` | 独立珍珠冰晶主花与下垂铃花 | `Bruma_pearlescent_ice_flower_standalone_transparent(2).png` |
| `Title_Solstice_Dendrite.png` | 最终尖锐书法字形，珍珠白、冰蓝紫、浅金晶体材质 | `a_high_resolution_transparent_background_decorati.png` |
| `complete-animation.html` | 已嵌入四张原图的完整动画，单文件离线运行 | 本次确认的 GitHub 动画 |
| `README.md` | 本说明 | — |

## 二、已定稿动画（不可擅改）

源版本：GitHub `demo/solstice-dendrite-back-back-reveal-20261119` 的 `complete-animation.html`。

1. 丁达尔圣光展开，**光照强度 105%、光束宽度 100%、雾气密度 100%**，不渲染额外可见微粒。
2. 卡牌以双面**新牌背**沿斜轴旋转下降；这一阶段圣光叠在卡牌上方。
3. 卡牌悬停等待点击。
4. 用户点击后，隐藏的另一面才切换成真正的**新牌面**，翻转时牌面层级高于圣光。
5. 原样保留 V4 冰晶爆发、六角雪花径向折光和冻结逻辑；揭晓持续 **1.42 秒**。

保留原进场时间：圣光约 0.95 秒、卡牌下降约 4.45 秒；可点击跳过降临，不能跳过必须由点击触发的揭晓。

## 三、打开与复用

解压后直接用 Safari / Chrome 打开 `complete-animation.html`。此文件已内嵌原画，**无需再导入 ZIP**。点击 **Guess What?** 开始降临，点击下降画面跳到悬停，再点击揭晓。

四张独立 PNG 同时保留，供 Procreate、网站和后续精修使用。以独立 PNG 为不可更改的正式美术素材；HTML 内嵌图片仅用于离线展示。

## 四、保护规则

- 不修改卡框边缘、背景、光照、亮度、镜头或构图。
- 不改变字体尖锐轮廓，不将字号和字形替换成普通字体。
- 不用 AI 重绘代替已确认的 PNG。
- 保留原始 PNG 的 Alpha 与像素质量。
- 不覆盖以前已定稿的动画分支与网站 `main`。
