---
id: android.bitmap-memory-oom-coil
aliases: []
title: Bitmap 内存计算公式、采样复用（inSampleSize/inBitmap）与 Coil 优势
summary: 掌握 Bitmap 占用内存精确计算公式（含屏幕密度缩放系数），及防 OOM 四板斧与基于 Kotlin 协程的现代图片库 Coil 对比优势。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - Bitmap 内存公式
  - inSampleSize 采样率
  - inBitmap 内存复用
  - Hardware Bitmap 显存
  - Coil 协程原生优势
references:
  - title: Android Developers - Load large bitmaps efficiently
    url: https://developer.android.com/topic/performance/graphics/load-bitmap
    type: official
    verifiedAt: "2026-11-20"
  - title: Coil Official Docs - Overview & Architecture
    url: https://coil-kt.github.io/coil/
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **精确内存公式（必背，区分资源目录 vs SD 卡/网络图）**：
  - **本地/网络流原尺寸解码**：`宽度(px) × 高度(px) × 每像素字节数`（默认 `ARGB_8888` 占 4 字节、`RGB_565` 无透明占 2 字节）；
  - **放在 `res/drawable-xxx` 里的本地资源图**：系统会按设备屏幕密度自动等比缩放，公式为 **`宽 × 高 × (targetDensity / inDensity)² × 每像素字节数`**（所以高分屏误把大图塞进低密度 `drawable-mdpi` 文件夹会让内存瞬间膨胀 **4–16 倍**！）。
- **大图防 OOM 核心四板斧**：① `inJustDecodeBounds = true` 先测尺寸，算 2 的幂次采样率 **`inSampleSize`** 降采样解码；② 不需半透明时切 `RGB_565` 砍半内存；③ 利用 **`inBitmap`** 复用缓存池里废弃 Bitmap 内存（API 19+ 只需新图字节数 `<=` 复用的已分配总字节）；④ 超长图/超大图（清明上河图）局部预览使用 **`BitmapRegionDecoder`** 配合手势滑块区域加载。
- **现代图片库 `Coil` 亮点**：纯 Kotlin 编写，原生绑定 **协程 + OkHttp + Jetpack Lifecycle + `ImageDecoder`**，方法数与体积比 Glide 小很多，且支持现代 Compose **`AsyncImage`** 极其丝滑。

## 核心原理解析

### 1. Android 8.0+ `Bitmap` 像素内存放在哪？以及 `Hardware Bitmap`
- **历史演进**：Android 3.0–7.1 期间 Bitmap 像素数据存在 **Java Dalvik/ART 堆** 里，几张大图就能打爆有限的应用 Java Heap 引发 OOM；**Android 8.0（API 26）起像素内存重新移回 Native C++ 堆**（借助 `NativeAllocationRegistry` 在 Java 壳被 GC 时自动释放底层 Native 像素块），Java 堆不轻易爆了，但仍会吃光物理内存被 LMKD 杀进程，依然必须做好宽高采样！
- **`Hardware Bitmap`（`Bitmap.Config.HARDWARE`，API 26+）**：像素直接存放在 **GPU 显存**中不可在 CPU 修改，省下了一份冗余内存拷贝且绘制极快；**注意坑点**：不能用于软件绘制 Canvas（`isSoftware`）、无法直接调用 `getPixel()` 像素读取或截图涂鸦修改，若需二次编辑必须拷贝转成普通 Config。

### 2. Glide vs Coil 核心选型对比
对于传统 Java/XML 大工程、复杂自定义 ModelLoader 与深度缓存调控历史沉淀，**Glide** 仍极其稳健；对于新建 **纯 Kotlin + 协程 + Jetpack Compose** 项目，**Coil 3**（甚至支持 KMP 跨平台）接入极轻、与 OkHttp 共享连接池天然统一、无需繁琐注解处理器配置，已成 Google 官方示例推荐新宠。

## 图解流程

| 维度 | `ARGB_8888` | `RGB_565` | `Hardware Bitmap` | 局部高清方案 |
| :--- | :--- | :--- | :--- | :--- |
| **单像素内存** | 4 字节（含 Alpha 通道） | **2 字节（无透明，省 50%）** | 仅存 GPU 显存（不占双份 CPU 堆） | 只解码视口局部区块 |
| **核心限制 / 坑点** | 内存占用最大 | 无透明通道且微弱色彩断层 | **不能被 CPU `Canvas` 绘制或读像素** | 仅限本地文件/随机访问流 |
| **典型场景** | 含透明通道 icon、通用 UI | 不透明风景图、列表缩略封面 | 固定只展示不二次修改的纯 UI 卡片 | 超长图、高清长图查看器 (`BitmapRegionDecoder`) |

## 高频追问与关键词

- **追问 1**：为什么 `inSampleSize` 官方建议设置成 **2 的幂次**（如 2、4、8）？设成 3 会怎么样？
  - 关键词：底层 JPEG/PNG 解码器（`libjpeg`/`Skia`）原生只按 2 的幂次做高效步长下采样，传入非 2 的幂（如 3）会被向下取整为最近似 2 的幂（2）处理，或者需额外二次缩放耗时。
- **追问 2**：为什么把一张 `1000×1000` 的启动引导背景图放到 `res/drawable-mdpi` (160dpi)，在 `xxhdpi` (480dpi) 手机上加载会占多少内存？
  - 关键词：放大倍数为 `(480 / 160)² = 9 倍`！内存变为 `1000 × 1000 × 9 × 4B ≈ 36 MB`（而不是 4MB）！背景大图应放高密度目录如 `drawable-xxhdpi` 或放 `nodpi` 禁止盲目缩放。

## 延伸参考

参考 Android 官方大图高效加载指南与 Coil 官方架构文档。
