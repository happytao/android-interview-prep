---
id: android.screen-adaptation-foldable
aliases: []
title: 屏幕适配原理（dp/sp/density、SmallestWidth）与折叠屏/大屏适配
summary: 理解像素换算公式（px = dp × density）与系统碎片化本质，对比 SmallestWidth 限定符与屏幕缩放方案优劣，并掌握 Jetpack WindowManager 折叠态与大屏自适应布局。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - px = dp * density
  - SmallestWidth (sw360dp)
  - 屏幕等比缩放方案权衡
  - Jetpack WindowManager 折叠态
  - 大屏自适应布局 Canonical Layouts
references:
  - title: Android Developers - Support different screen sizes
    url: https://developer.android.com/develop/ui/views/layout/responsive-adaptive-design-with-views
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Learn about foldables & WindowManager
    url: https://developer.android.com/develop/ui/compose/layouts/adaptive/foldables/learn-about-foldables
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **屏幕适配基石公式**：**`px = dp × (dpi / 160)`**，其中 `density = dpi / 160`；`dp` 解决**物理尺寸跨分辨率一致性**，而 `sp`（Android 14+ 引入非线性缩放防止极大字号爆框）额外叠加系统字体大小偏好。
- **为什么同样标称 1080×2400 的两部手机，用 `dp` 写出来依然比例不一致？**：因为两部手机屏幕的**实际可用逻辑宽度（`screenWidthDp = widthPx / density`）** 并不统一（比如一台是 360dp，另一台是 392dp 或 411dp），按 375dp 设计稿写死的 `300dp` 卡片在窄机上占 83%，在宽机上只占 72%！
- **主流方案演进与折叠屏大屏时代转变**：
  - 传统纯直板手机精细还原：**`SmallestWidth`（`values-sw360dp`）多套 dimen 文件** 或 **今日头条屏幕等比缩放方案（按 `targetWidthDp` 动态算 `density`）**；
  - **现代折叠屏/平板（绝对禁区提醒！）**：大屏/折叠展开后如果还傻傻套用“按全屏宽度等比放大”，按钮和文字会瞬间变成巨无霸！现代大屏和折叠屏官方强调 **响应式自适应布局（Adaptive Layouts）**：基于 **`WindowSizeClass`（Compact / Medium / Expanded）** 在窄屏单栏、大屏切双栏（列表+详情 `ListDetailPaneScaffold`），并通过 **Jetpack `WindowManager` (`WindowInfoTracker`)** 监听铰链折叠态（Tabletop 半折 / Book 态）动态避让折痕区。

## 核心原理解析

### 1. 今日头条适配方案的原理与三大隐患
- **核心原理**：修改 `Resources.getDisplayMetrics()` 中的 **`density`、`scaledDensity` 和 `densityDpi`** 为 `当前设备屏幕总宽像素 / 设计稿基准宽 dp`（例如 `1080 / 375 = 2.88`），让系统算出来所有页面的真实逻辑宽都严丝合缝等于 `375dp`！
- **隐患与克制**：① 属于全局强行改 `DisplayMetrics`，会导致接入的三方库（如系统控件、WebView、广告 SDK）大小也一起被强行按比例放大/缩小产生意外（需配合自定义或过滤特定页面关闭）；② **在折叠屏展开（宽度变 700dp+）和分屏多窗口模式下，如果还按宽等比放大极其荒谬**，必须针对大屏宽阈值切换回原生 `WindowSizeClass` 响应式双栏！

### 2. `SmallestWidth` (`sw<N>dp`) 与响应式窗口断点
- `values-sw360dp/dimens.xml`、`values-sw400dp/dimens.xml`… 本质是编译期或脚本生成按屏幕**最短边 dp** 匹配的不同换算比例尺寸表，**无任何运行时侵入副作用**，略微增加一点编译时资源条目（若配置过多套注意控制体量）；
- **折叠屏折叠态切换注意**：展开或折叠物理屏幕会触发 `screenSize | smallestScreenSize | screenLayout` 配置变更重启 Activity（若不想丢状态需妥善配置 `ViewModel` 与 `SavedStateHandle`），同时借助 **`WindowInfoTracker.getOrCreate(activity).windowLayoutInfo(activity)`** 返回的 `Flow` 感知 `FoldingFeature` 折痕坐标与 `HALF_OPENED` 半折叠态调整播放器/控制区上下分屏摆放。

## 图解流程

| 适配方案 | 实现机制 | 优势 | 劣势 / 现代大屏局限 |
| :--- | :--- | :--- | :--- |
| **约束布局 + 百分比 (`ConstraintLayout`)** | 相对权重、Chain 链、宽高比 `dimensionRatio` | **官方首选基础**，无任何侵入性 | 纯比例无法细致微调不同屏幕精细字体缩放 |
| **`SmallestWidth` 限定符 (`sw<N>dp`)** | 预设多套 `dimens.xml` 资源自动匹配 | 零运行时黑科技副作用、稳定性极高 | 仅能覆盖常见几档，小幅增加资源目录数量 |
| **动态改 `density`（头条方案）** | 重写 `DisplayMetrics.density` | 像素级精准还原固定设计稿，改造成本极低 | 全局污染三方库/弹窗；**极不适配折叠屏展开与平板** |
| **Jetpack `WindowSizeClass` + `WindowManager`** | **断点响应式单双栏切换 + 折叠铰链监听** | **Android 12L–16 大屏/折叠屏官方唯一正解** | 需要设计端同步提供大屏双栏/三栏交互稿 |

## 高频追问与关键词

- **追问 1**：为什么 Android 14 起 `sp` 字体改成了“非线性字体缩放”（Non-linear font scaling）？
  - 关键词：以前如果用户为了看清把系统字号调成 `200%`，原先 24sp 的大标题会翻倍变成吓人的 `48sp` 撑爆整个布局；Android 14+ 自动对原本已经很大的字号减小放大倍率，对小正文保持足够放大，既满足无障碍视觉需求又防止大标题排版崩坏。
- **追问 2**：如何在不改业务老代码的情况下，通过 Android 16 大屏新规的检查？
  - 关键词：注意 Android 16（API 36）起大屏（`sw >= 600dp`）上系统会**默认忽略开发者写的固定竖屏锁定 `screenOrientation="portrait"` 和 `resizeableActivity="false"`**，强制窗口自适应可缩放！因此所有核心列表、表单和详情页必须测试横屏/分屏/可拖拽窗口下的健壮性（使用 `ScrollView` / `LazyColumn` / `ConstraintLayout` 不写死固定宽高）。

## 延伸参考

参考 Android Developers Responsive & Adaptive Design 以及 Foldables WindowManager 官方指南。
