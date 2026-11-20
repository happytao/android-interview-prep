---
id: android.invalidate-vs-requestlayout
aliases: []
title: invalidate()、postInvalidate() 与 requestLayout() 核心差异与触发范围
summary: 精确对比 UI 刷新三大触发方法各自的调用线程限制、是否重走 Measure/Layout 以及向上传递到 ViewRootImpl 的差异。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 4
status: published
keywords:
  - invalidate 只走 Draw
  - postInvalidate Handler 切主线程
  - requestLayout PFLAG_FORCE_LAYOUT
  - ViewRootImpl.checkThread
  - 硬件加速重绘优化
references:
  - title: Android Developers - View.invalidate & requestLayout
    url: https://developer.android.com/reference/android/view/View#invalidate()
    type: official
    verifiedAt: "2026-11-20"
  - title: HenCoder - 自定义 View 布局与刷新解析
    url: https://hencoder.com/ui-1-1/
    type: blog
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **本质一句话区分**：
  - **`invalidate()`**：仅外观内容变了（颜色、文字、动画进度），**位置和大小不变** → 只标记重绘，**不会重走 `onMeasure` 和 `onLayout`**，直接请求下一帧 VSync 走 `draw` 阶段；
  - **`postInvalidate()`**：底层就是通过 **`ViewRootImpl` 的 `Handler`** 向主线程发消息再调 `invalidate()`，专门用来**在工作线程安全发起刷新**（而 `invalidate()` 必须在主线程调）；
  - **`requestLayout()`**：尺寸或位置可能变了（改了宽高、边距、增删子 View）→ 给自身及**所有父容器一路往上打上 `PFLAG_FORCE_LAYOUT` 标记**直到 `ViewRootImpl`，下一帧重新执行 **`measure` → `layout`**（仅当位置或尺寸真发生变化、或者带了需要重绘的标记时才会顺带触发重绘）。

## 核心原理解析

### 1. 硬件加速开启前后 `invalidate()` 的重绘范围区别
- **软件绘制时代**：`invalidate()` 会自底向上把脏区矩形（Dirty Rect）合并到父容器，再由 `ViewRootImpl` 自顶向下只重绘跟脏区相交的控件；
- **现代硬件加速开启后（Android 4.0+ 默认开启）**：每个普通 `View` 的绘制指令录制在独立的 `DisplayList` / `RenderNode` 中；某个小 View 调 `invalidate()` 只会导致它自身重建轻量 `DisplayList` 并提交给 `RenderThread` 重组合成，**同级兄弟视图的 `onDraw` 根本不会被重新调用**，性能极高。

### 2. 为什么修改了 `TextView.setText()` 时有时走 `invalidate`，有时走 `requestLayout`？
`TextView.checkForRelayout()` 非常聪明：
- 如果 `TextView` 宽高固定死（比如 `100dp × 40dp`）且文本长度改变不会影响控件外部边界，它只调用 **`invalidate()`**；
- 如果宽高是 `wrap_content` 且新文本导致所需宽度改变，它会自动升级触发 **`requestLayout()`** + **`invalidate()`** 重新测量摆放。

## 图解流程

| 方法名称 | 调用线程约束 | 触发 `Measure` | 触发 `Layout` | 触发 `Draw` | 典型应用场景 |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`invalidate()`** | **必须在主线程** | 否 | 否 | **是** | 改背景色、进度条重绘、自定义绘制动画 |
| **`postInvalidate()`** | **任意子线程可调** | 否 | 否 | **是** | 子线程计算完波形数据后通知自定义 View 重绘 |
| **`requestLayout()`** | **必须在主线程** | **是**（沿父树标记） | **是** | 视边界变动而定（通常辅以 `invalidate`） | 改 `LayoutParams` 宽高、`addView`/`removeView` |

## 高频追问与关键词

- **追问 1**：如果在子线程调 `invalidate()` 一定会抛 `CalledFromWrongThreadException` 吗？
  - 关键词：在正常创建完毕的页面中，`invalidateInternal` 一路向上传递到 `ViewRootImpl.invalidateChildInParent()` 会第一时间调 `checkThread()` 立即抛异常；而现代协程下更推荐切回 `Dispatchers.Main` 统一刷新 UI。
- **追问 2**：执行 `requestLayout()` 后如果在布局过程中没有发生任何位置和尺寸变更，`onDraw()` 一定会自动触发吗？
  - 关键词：**不一定**！若 `View` 本身位置大小没变且没有置位 `PFLAG_DIRTY` 重绘标记，系统出于省电与效率考量可以跳过 `onDraw()`；因此修改自定义 View 内部配置同时影响外观与大小时，标准写法是 **`requestLayout(); invalidate();`** 双保险。

## 延伸参考

参考 Android 官方 `View.invalidate()` 与 `View.requestLayout()` API 规范。
