---
id: android.vsync-choreographer-jank
aliases: []
title: VSync 信号、Choreographer 调度、双缓冲/三缓冲与丢帧（Jank）原理
summary: 拆解 Android 屏幕刷新节奏（60Hz/120Hz）内 VSync、Choreographer 四类回调、RenderThread 与双/三缓冲轮转如何协作以及掉帧产生的底层根因。
priority: must-know
difficulty: hard
frequency: 5
estimatedMinutes: 7
status: published
keywords:
  - VSync 脉冲信号
  - Choreographer.doFrame
  - RenderThread 异步栅格化
  - 双缓冲与三缓冲
  - SurfaceFlinger Jank
diagram: VsyncPipelineSvg
references:
  - title: Android Source - VSync and Choreographer Architecture
    url: https://source.android.com/docs/core/graphics/implement-vsync
    type: aosp
    verifiedAt: "2026-11-20"
  - title: Android Developers - Slow rendering (Jank)
    url: https://developer.android.com/topic/performance/vitals/render
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **一句话概览**：为了消除屏幕撕裂并对齐显示器刷新率（60Hz = 16.6ms，120Hz = 8.3ms），Android 通过 **`Choreographer`（编舞者）** 接收系统硬件 **VSync（垂直同步）**信号，统一驱动一帧内的输入、动画与绘制工作，最后交由 **`RenderThread` + GPU** 渲染进图形缓冲区，由 **`SurfaceFlinger`** 合成上屏。
- **单帧生命周期三大步**：① VSync 抵达唤醒主线程执行 `Choreographer.doFrame()`（Input → Animation → Insets → Traversal 测量布局录制 DisplayList）；② 同步移交独立渲染线程 **`RenderThread`** 调用 GPU 栅格化到 `GraphicBuffer`（释放主线程去干下一帧）；③ 下一 VSync 到达时 **`SurfaceFlinger`** 把准备好的新图层合成输出给显示屏。
- **为什么会丢帧（Jank）**：CPU 主线程测量/业务耗时 + GPU 渲染耗时超过单帧预算（如 > 16.6ms），导致 SurfaceFlinger 上屏时刻拿不到新 `GraphicBuffer`，被迫继续显示上一帧旧画面（即掉帧卡顿）。

## 核心原理解析

### 1. 为什么必须引入“双缓冲 / 三缓冲”机制？
- **单缓冲痛点**：GPU 边往屏幕正在扫描输出的同一块内存里画新图，屏幕扫描半截就会出现上下撕裂画面；
- **双缓冲（Front Buffer + Back Buffer）**：显示器读 Front Buffer 扫描显示，App/GPU 在 Back Buffer 里画下一帧；VSync 到来且渲染完毕时指针交换（SwapBuffers）。**缺点**：如果某帧耗时超了 16.6ms 错过第一个 VSync，在等第二个 VSync 期间由于只有两块缓冲区且 Front 正在被占着显示、Back 刚画完还没交换出去，CPU/GPU 会干等卡死掉下一整帧！
- **三缓冲（Triple Buffering）**：引入第三块备用 Buffer。当某帧超时占用着两个 Buffer 时，CPU/GPU 可以立刻切换去画第 3 块 Buffer，大幅改善连续滑屏掉帧时的“连环卡顿”，但代价是增加一份多核图元显存占用与 1 帧操作输入延迟（现代高刷机普遍动态按需启用三缓冲）。

### 2. `Choreographer` 的四大回调队列优先级
`Choreographer.doFrame()` 严格按照以下顺序依次执行该帧内的全部回调：
1. `CALLBACK_INPUT`（处理本周期触屏输入事件，保证滑动先更新偏移再画）；
2. `CALLBACK_ANIMATION`（属性动画插值计算）；
3. `CALLBACK_INSETS_ANIMATION`（软键盘与系统栏动画联动）；
4. `CALLBACK_TRAVERSAL`（执行 `ViewRootImpl.doTraversal()` → Measure / Layout / Draw）；
5. `CALLBACK_COMMIT`（帧尾提交整理）。

## 图解流程

:::diagram VsyncPipelineSvg
:::

## 高频追问与关键词

- **追问 1**：既然 VSync 每 16.6ms 一次，为什么 App 静止不动的时候不会每 16.6ms 白白重绘一次耗电？
  - 关键词：Android 采用**按需请求 VSync（`scheduleVsync`）**机制——只有当页面执行了 `invalidate()`、`requestLayout()` 或正在播放动画时才会向系统申请下一次 VSync；画面静止时主线程完全通过 `epoll_wait` 休眠零耗电。
- **追问 2**：在现代 120Hz 高刷手机上做性能排查，单帧时间预算变成多少？线上怎么衡量卡顿？
  - 关键词：120Hz 单帧预算缩半至 **8.33ms**；线上通过 `FrameMetrics` API（API 24+，`Window.addOnFrameMetricsAvailableListener`）精准获取每帧在主线程 vs RenderThread vs GPU 各阶段耗时及掉帧率（Janky Frames）。

## 延伸参考

参考 AOSP VSync 实施文档与 Android Developers 渲染性能慢排查指南（Slow rendering）。
