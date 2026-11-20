---
id: android.apk-size-shrinking
aliases: []
title: APK/AAB 包体积瘦身体系化方案
summary: 从代码（R8 Full Mode）、资源（WebP/AVIF、R8 优化资源裁剪、resConfigs 语言拆分）、原生库（ABI 裁剪与按需下发）到动态包格式（AAB）给出系统化瘦身实战方案。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - R8 Full Mode 代码裁剪
  - R8 优化资源裁剪
  - resConfigs 语言过滤
  - WebP / AVIF / SVG 矢量化
  - .so ABI 拆分与 AAB 动态下发
references:
  - title: Android Developers - Reduce your app size
    url: https://developer.android.com/topic/performance/reduce-apk-size
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Android App Bundle (AAB)
    url: https://developer.android.com/guide/app-bundle
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **瘦身第一步（先量化摸底）**：利用 Android Studio **APK Analyzer** 拆开分析大头分布——90% App 体积大户永远集中在三块：**`res/` 资源图片、`lib/` 原生 `.so`、`classes.dex` 代码**。
- **四大维度精准砍体积**：
  1. **代码瘦身**：开启 **`isMinifyEnabled = true`（R8 Full Mode）** 激进删死代码；统一收敛重复功能三方库（如删掉重型多套 JSON/图片框架并清理过期老代码）；
  2. **资源瘦身**：开启 **`isShrinkResources = true`** 并搭配现代 **R8 优化资源裁剪（`android.enableR8.optimizedResourceShrinking = true`）**（替代早期不兼容 AAB 的老牌 `AndResGuard`）；大背景图转为 **WebP/AVIF**，纯色小图标全转 **`VectorDrawable`（SVG）**，用 **`resConfigs("zh-rCN", "en")`** 删掉 Jetpack/AppCompat 自带的几十种小语种冗余翻译文本！
  3. **`.so` 原生库瘦身**：`abiFilters` 精准按发布渠道筛选架构（国内仅留 `arm64-v8a` 或按需双包拆分，`armeabi-v7a` 逐渐退役，绝不盲目把 `x86`/`x86_64` 模拟器库打进线上包！）；超大音视频/AI 模型 `.so` 改为**首次使用动态下载**；
  4. **分发格式演进（Google Play / 现代分发）**：打包成 **`AAB`（Android App Bundle）** 上传商店，由商店根据用户设备 CPU 架构、屏幕密度和系统语言实时切片下发最小包（通常立减 **20%–40%**）。

## 核心原理解析

### 1. 为什么逐步淘汰老工具 `AndResGuard` 转向 R8 资源优化？
过去常用微信 `AndResGuard` 在打包后期直接暴力重命名 `res/drawable/abc_xxx` 为短路径并修改 `resources.arsc` 混淆瘦身，甚至 7z 极限压缩；但 `AndResGuard` 强依赖传统 APK 物理文件修改，**与现代 `AAB` 格式及 Google Play V3/V4 优化管线极易冲突且缺乏官方长期维护**。从 AGP 8.x 起，官方通过开启 R8 优化资源裁剪可以直接将未引用资源的映射与字节码裁剪打通，安全可靠且同时完美兼容 APK 与 AAB。

### 2. 开启 `isShrinkResources = true` 时的常见“误删动态资源”坑
如果代码里使用了 `resources.getIdentifier("icon_" + type, "drawable", packageName)` 通过动态拼接字符串找图片，R8 静态分析扫描不到显式 `R.drawable.icon_1` 引用，会直接把这组图片删掉导致运行期找不到资源崩溃！
- **解法**：坚决减少 `getIdentifier` 反射查资源（本身也很慢）；若必须动态映射，在 `res/raw/keep.xml` 中配置 `<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@drawable/icon_*" />` 保留或显式用 `when` 映射 `R.drawable.*` 常量。

## 图解流程

| 瘦身维度 | 关键举措 | 预期收益 | 注意事项 |
| :--- | :--- | :---: | :--- |
| **代码与依赖** | R8 Full Mode + 去重三方库 | 中等（10%–25%） | 处理好 `keep.xml` 与混淆规则防动态反射挂掉 |
| **图片与资源** | WebP/AVIF + 矢量 SVG + `resConfigs` + R8 资源裁剪 | **极高（常省 20%–50%）** | 引导图/大动效切勿放多套 PNG；警惕动态 `getIdentifier` 误删 |
| **Native `.so`** | 剔除 `x86`、仅留 `arm64-v8a` / 分架构出包、重库动态下发 | **极高（动辄几十 MB）** | 主流商店已要求 64 位必配，独立渠道包可彻底隔离 32/64 位 |
| **分发架构** | **AAB**（商店按需切片下发） | 立降 20%–40% | 国内多应用商店渠道若仍只收 APK，采用分架构多 APK 分发策略 |

## 高频追问与关键词

- **追问 1**：为什么开启 `isShrinkResources` 时如果开启了 `shrinkMode="strict"` 会有什么不同？
  - 关键词：默认 `safe` 模式保留一切似乎可能被反射或 `getIdentifier` 拼出来的资源，保守但有残留；`strict` 模式只保留严格静态代码引用链路可达的资源，裁得更干净，但要求项目内部必须彻底消除或明确白名单声明动态名称资源。
- **追问 2**：一个 APK 里的 `resources.arsc` 体积也很大，为什么 `resConfigs` 能显著减小它？
  - 关键词：引入 `AppCompat`、Material、Google Play Services 等大库时会把全球 70 多种语言的 `values-xx/strings.xml` 全量合进 `resources.arsc` 字符串池，配置 `resConfigs("zh", "en")` 直接把多余几十门语言字符串条目瞬间砍掉 80% 以上。

## 延伸参考

参考 Android Developers Reduce App Size 与 Android App Bundle (AAB) 官方指南。
