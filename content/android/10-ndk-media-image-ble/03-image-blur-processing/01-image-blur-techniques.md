---
id: android.image-blur-techniques
aliases:
  - image-blur
title: Android 高斯模糊方案演进与性能对比（RenderEffect / AGSL / OpenGL / NDK）
summary: 系统对比已废弃的 RenderScript、Android 12+ 硬件加速 RenderEffect、Android 13+ AGSL 着色器以及兼容低版本的“极速降采样 + C++/NDK StackBlur 或 OpenGL 多 Pass 卷积”核心技术选型。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 6
status: published
keywords:
  - RenderEffect.createBlurEffect (API 31+)
  - AGSL RuntimeShader (API 33+)
  - RenderScript 弃用与替代
  - 先缩放降采样再模糊原则
  - NDK StackBlur vs OpenGL 两步高斯
references:
  - title: Android Developers - RenderEffect API Reference
    url: https://developer.android.com/reference/android/graphics/RenderEffect
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - AGSL Quick Start
    url: https://developer.android.com/develop/ui/views/graphics/agsl
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **高斯模糊面试的核心抓手——“分版本层次选型 + 降采样几何级提速法则”**：
  1. **高版本官方首选硬件直通**：
     - **Android 12（API 31+）**：一行 **`View.setRenderEffect(RenderEffect.createBlurEffect(rx, ry, Shader.TileMode.CLAMP))`** 或 Compose **`Modifier.blur()`**，直接挂在 `RenderThread` 硬件渲染管线执行，零额外 Bitmap 分配、极其丝滑（还支持动态实时背景模糊动画）；
     - **Android 13（API 33+）**：可用 **AGSL（Android Graphics Shading Language）`RuntimeShader`** 自定义任意非均匀渐进模糊、毛玻璃噪声叠加等高端动效；
  2. **兼容低版本（API < 31）及静态大图最优解**：
     - **`RenderScript` 已自 Android 12 起彻底废弃**（且高版本存在首次编译卡顿与 64 位兼容性维护包袱），新项目勿用；
     - 低版本替代：一律遵守 **“先 1/4 ~ 1/8 降采样缩图 → 再做模糊 → 硬件插值放大展示”** 的原则！小图用 **NDK C++ NEON/SIMD 加速版 `StackBlur`（或 Google RenderScript Toolkit 库）**，超重实时动态模糊场景用 **OpenGL ES 拆分为水平+垂直两 Pass 1D 高斯卷积（时间复杂度从 `O(R²)` 降至 `O(2R)`）**。

## 核心原理解析

### 1. 为什么“先缩图 1/8 再小半径模糊”既不失真又快上 60 倍？
高斯模糊本身就是高频细节抹除算法——既然原本就要把图像锐利细节糊掉，直接拿一张 `1080×1920` 原图做半径 `25` 的卷积简直是算力灾难（约需计算两百多万像素 × 大核卷积，耗时轻松破百毫秒掉帧）！
- 若先 `Bitmap.createScaledBitmap`（或 `inSampleSize = 8`）缩成 `135×240` 小图，**像素总量直接锐减为 1/64**；再对小图做半径 `4~6` 的卷积（只需 < 2ms），最后交给 `ImageView` / `Canvas` 硬件双线性插值拉伸铺满全屏——由于本来就需要朦胧平滑感，双线性插值放大的过渡甚至让边缘更顺滑，肉眼几乎完全看不出锯齿，**性能与内存直接提升一个数量级**！

### 2. 传统高斯模糊 vs 快速均值近似（StackBlur / Dual Kawase Blur）
- **标准二维高斯卷积**：计算窗口 `(2R+1)²`，算力随半径 `R` 平方爆炸；即便利用高斯核可分离性质拆为“水平 1D + 垂直 1D”，超大模糊半径依然不轻；
- **StackBlur（栈模糊）**：基于滑动窗口直方图增量加减的近似高斯算法，**计算复杂度是神奇的 `O(1)`（与模糊半径 `R` 无关！）**，因此在 CPU / NDK 离线模糊中最受图片库欢迎（如 Glide `BlurTransformation` 经典底座）；
- **Dual Kawase Blur（双重 Kawase 模糊）**：游戏与客户端动态实时背景毛玻璃（如 iOS 弹窗背景实时变模糊）的 GPU 最爱，靠连续多次“降采样滤镜 + 升采样滤镜”叠加实现大范围极度丝滑模糊，GPU Texture 采样次数少到极致。

## 图解流程

| 技术方案 | 适用版本 / 环境 | 执行位置 | 典型耗时（1080P 降采样后） | 优缺点与工程建议 |
| :--- | :--- | :--- | :--- | :--- |
| **`RenderEffect.createBlurEffect`** | Android 12+ (API 31) | GPU (`RenderThread`) | < 1ms（原生硬件合成） | **最简单高效**；直接作用于 View 或 Compose 节点，但只模糊自身内容，做背景实时透底模糊需结合特殊截帧或系统 Window 模糊 API |
| **AGSL `RuntimeShader`** | Android 33+ | GPU 片元着色器 | ~1ms | 可编写渐进模糊（顶部清晰底部渐糊）、噪点玻璃质感等定制效果 |
| **NDK `StackBlur` + 降采样** | 全版本兼容（静态图片） | Native C++ 多核/SIMD | 1–3ms（异步线程） | 不占 OpenGL 上下文，配合 Glide 磁盘/内存缓存非常适合歌单封面/头像背景图 |
| **OpenGL ES 双 Pass / Dual Kawase** | 全版本（实时视频/动效） | GPU FBO 纹理渲染 | ~1–2ms | **大半径动态模糊王者**；需维护 EGL/FBO 上下文，避免频繁建删纹理 |
| **`RenderScript`（已废弃）** | Android 12 前老方案 | 历史异构驱动 | 2–5ms | API 31+ 正式 `@Deprecated`；高版本实际退回 CPU 运行或发警告，推荐迁出至 **RenderScript Intrinsics Replacement Toolkit** |

## 高频追问与关键词

- **追问 1**：如果想做类似于弹出底部对话框时，背后底层页面还能不断动态变化并且实时穿透变成毛玻璃效果（Real-time Window Blur），Android 上怎么实现？
  - 关键词：Android 12+ 系统窗口原生支持 **`Window.setBackgroundBlurRadius()` / `windowBlurBehindEnabled`**（受厂商中低端机性能策略或省电模式开关降级影响需判 `WindowManager.isCrossWindowBlurEnabled`）；若应用内自定义实时透底模糊（API < 31），典型方案是自定义 ViewGroup 在 `onPreDraw` 抓取底层节点绘制到缩小的 Offscreen `Canvas/FBO` 做 1 次模糊后再贴作蒙层（注意防 `onPreDraw` 无限死循环重绘）。
- **追问 2**：做完模糊的静态 Bitmap 用完如果高频滑动列表反复生成新 Bitmap 会造成内存抖动怎么治？
  - 关键词：把最终产出存入 **Glide `BitmapPool` / `LruCache`** 并在 Glide `Transformation` 重写 **`updateDiskCacheKey()`**，让同一张原图+固定模糊半径只算一次后直接复用内存与磁盘结果！

## 延伸参考

参考 Android Developers `RenderEffect` 官方 API 与 AGSL 图形着色器指南。
