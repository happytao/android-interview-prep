---
id: android.animation-system-comparison
aliases: []
title: Android 动画全景对比（帧动画、补间动画、属性动画、Transition/MotionLayout、Lottie）
summary: 对比 Android 传统视图动画、属性动画、Transition/MotionLayout 转场与 Lottie 矢量动画的核心机制、交互点击区域差异及内存/GPU 性能优化规范。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - View Animation 矩阵假象
  - Property Animator 真属性
  - 帧动画 OOM 风险
  - Transition / MotionLayout
  - Lottie 硬件加速与缓存
references:
  - title: Android Developers - Animations overview
    url: https://developer.android.com/develop/ui/views/animations/overview
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - MotionLayout
    url: https://developer.android.com/develop/ui/views/animations/motionlayout
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **五大主流动画分类选型**：
  1. **帧动画（`AnimationDrawable`）**：逐帧轮播图片，实现最简单但**极易导致多张大图瞬间载入内存 OOM**（超过几帧的高清动画禁止用帧动画，改用 Lottie 或 WebP/SVGA）；
  2. **补间动画（Tween / View Animation）**：`Alpha/Scale/Translate/Rotate`，缺点致命——**只修改 `Canvas` 绘制矩阵产生视觉位移假象，控件真实的点击坐标区域仍留在原地不动**；
  3. **属性动画（Property Animator，`ObjectAnimator`/`ValueAnimator`）**：真正随时间动态修改目标对象的属性（如 `translationX`），**点击区域同步跟随移动**，适用于任意对象任何属性；
  4. **转场与约束动画（`Transition` / Shared Element / `MotionLayout`）**：专攻页面共享元素平滑切换及手势驱动的关键帧路径复杂联动；
  5. **矢量动效库（`Lottie` / Compose 动画 API）**：设计师导出 JSON 矢量动画跨端高保真还原，现代 Compose 则直接以状态驱动 `animate*AsState` / `AnimatedVisibility`。

## 核心原理解析

### 1. 补间动画 vs 属性动画的底层核心分水岭
- **补间动画**：仅在父容器绘制子 View 时调用 `getChildStaticTransformation()` 把平移矩阵施加给 `Canvas` 临时渲染出位移外观，View 本身的 `left`/`top`/`translationX` 压根没改，点移走后的新位置点不中，点原来的老空地反而触发点击事件！
- **属性动画**：每帧回调直接通过 Setter（或优化后的 `RenderNode` 硬件属性通道）真实修改 `view.setTranslationX(...)` 并调用 `invalidateViewProperty()`，从而既刷新外观又同步更新触摸命中边界（`hitRect`）。

### 2. 复杂动画性能避坑守则
- **优先使用 `ViewPropertyAnimator`（`view.animate().translationX(...).alpha(...)`）**：专门针对 View 属性做批量合并刷新且天然对接硬件渲染节点，减少每帧多次 `invalidate()`；
- **善用硬件图层加速 `withLayer()`**：做纯平移/缩放/透明度动画时临时将复杂子布局缓存进 GPU `LAYER_TYPE_HARDWARE` 离屏纹理，动画结束自动释放还原；
- **Lottie 优化三板斧**：启用缓存策略避免重复解析 JSON、大图资产降维压缩或开启硬件加速渲染模式（`RenderMode.HARDWARE`）、不可见或离开屏幕时务必暂停动画避免后台空耗电。

## 图解流程

| 动画方案 | 驱动机制 | 点击热区是否同步移动 | 内存与性能表现 | 最佳应用场景 |
| :--- | :--- | :---: | :--- | :--- |
| **帧动画 (`AnimationDrawable`)** | 按帧间隔切 Bitmap | 不移动 | **极高 OOM 风险**（大图全驻堆内存） | 仅限 3–5 帧极小图标微动效 |
| **补间动画 (`Animation`)** | 临时修改 Canvas 变换矩阵 | **不移动（仍在原位）** | 轻 | 基本淘汰（仅极简非交互退场闪动） |
| **属性动画 (`ObjectAnimator`)** | VSync 驱动真实改属性值 | **同步移动** | 优（配合 `ViewPropertyAnimator` 更佳） | 绝大多数交互位移、进度、颜色渐变 |
| **`MotionLayout`** | `ConstraintSet` 关键帧插值 | **同步移动** | 优 | 复杂手势联动折叠头图、物理拖拽进度 |
| **`Lottie` / Compose** | 解析矢量路径 / 声明状态驱动 | 支持交互控制 | 优（矢量省包体且高分屏不失真） | 品牌加载、点赞微动画、引导页复杂插画 |

## 高频追问与关键词

- **追问 1**：为什么 `ViewPropertyAnimator` 通常比自己写几个 `ObjectAnimator` 放进 `AnimatorSet` 性能更好？
  - 关键词：`ViewPropertyAnimator` 会在单次 VSync 回调中把 `alpha`、`translationX`、`scaleX` 等多个变换属性一次性批量合并修改并只触发一次刷新，直接驱动底层 `RenderNode` 硬件变换通道，甚至无须通过反射找 Setter 方法。
- **追问 2**：在列表 `RecyclerView` Item 里播放循环动效需要注意什么？
  - 关键词：在 `onViewRecycled` / `onViewDetachedFromWindow` 中必须暂停并重置动画，防止复用错位或后台持续占用 Choreographer 回调导致严重泄漏与耗电。

## 延伸参考

参考 Android Developers Animations 概览与 MotionLayout 官方实战文档。
