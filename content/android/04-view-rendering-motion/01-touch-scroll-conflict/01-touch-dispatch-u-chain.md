---
id: android.touch-dispatch-u-chain
aliases: []
title: 触摸事件分发 U 型链路（Activity → DecorView → ViewGroup → View）
summary: 掌握三大核心方法（dispatchTouchEvent / onInterceptTouchEvent / onTouchEvent）的责任链递进与回溯规则，及 mFirstTouchTarget 的事件序列绑定机制。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 7
status: published
keywords:
  - dispatchTouchEvent
  - onInterceptTouchEvent
  - onTouchEvent
  - mFirstTouchTarget
  - OnTouchListener 优先级
diagram: TouchDispatchSvg
references:
  - title: Android Developers - Manage touch events in a ViewGroup
    url: https://developer.android.com/develop/ui/views/touch-and-input/gestures/viewgroup
    type: official
    verifiedAt: "2026-11-20"
  - title: Gityuan - Android 事件分发机制
    url: https://gityuan.com/2015/09/19/android-touch/
    type: blog
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **完整传递链**：事件由 `WMS` 经 `InputChannel` 递交给 **`Activity.dispatchTouchEvent()` → `PhoneWindow.superDispatchTouchEvent()` → `DecorView` → 外层 `ViewGroup` → 目标子 `View`**；如果底部没任何视图消费，则沿着同一路径**反向逐级向上回溯 `onTouchEvent()`**（即经典的 **U 型责任链**），最终没人要就回到 `Activity.onTouchEvent()` 结束。
- **三大方法核心关系**：`dispatchTouchEvent` 负责调度分发、`onInterceptTouchEvent` 仅 `ViewGroup` 拥有用于判断是否拦截、`onTouchEvent` 负责具体消费事件。
- **`mFirstTouchTarget` 核心优化**：`ACTION_DOWN` 确定好最终消费的子 `View` 后，父容器会把它记录到 `mFirstTouchTarget` 链表中；同一手势后续的 `MOVE`/`UP` 直接精准投递，无需再重复遍历全树查找。

## 核心原理解析

### 1. 事件序列一致性原则（以 `ACTION_DOWN` 为锚点）
一个完整触摸事件序列以 `ACTION_DOWN` 开始，中间包含若干 `ACTION_MOVE`，以 `ACTION_UP` 或 `ACTION_CANCEL` 结束：
- **DOWN 决定命运**：如果子 View 在 `ACTION_DOWN` 阶段返回 `false`（不消费），该父容器的 `mFirstTouchTarget` 为空，同一手势后续所有 `MOVE`/`UP` **不再下发给该子 View**，直接由父容器自己调用 `onTouchEvent()` 处理（除非使用 `TouchDelegate` 或特殊逻辑）。

### 2. 消费优先级链条（从高到低）
1. **`View.OnTouchListener.onTouch()`**：若设置了监听且返回 `true`，直接消费并拦截，后续 **`onTouchEvent()` 不会执行**（因此 `OnClickListener` 也就不会触发！）；
2. **`View.onTouchEvent()`**：处理按压态刷新、长按检测，并在 `ACTION_UP` 时触发 `performClick()`；
3. **`OnClickListener` / `OnLongClickListener`**：在 `onTouchEvent()` 内部被触发，优先级最低（只要 View 的 `clickable` 或 `longClickable` 为 `true`，`onTouchEvent()` 默认就会返回 `true` 消费事件）。

### 3. `ViewGroup` 跳过询问拦截的两个条件
在 `ViewGroup.dispatchTouchEvent()` 中，只有当 **`ACTION_DOWN` 或者 `mFirstTouchTarget != null`** 时才走拦截检查；如果子 View 调用了 `requestDisallowInterceptTouchEvent(true)`（置位 `FLAG_DISALLOW_INTERCEPT`），父容器在非 `ACTION_DOWN` 时会直接跳过 `onInterceptTouchEvent()`，因为 `ACTION_DOWN` 每次进入都会重置该标志位防止子 View 永远锁死父容器。

## 图解流程

:::diagram TouchDispatchSvg
:::

## 高频追问与关键词

- **追问 1**：如果一个 View 的 `enabled = false` 但 `clickable = true`，它的 `onTouchEvent` 返回什么？
  - 关键词：依然返回 `true`（照样吃掉触摸事件防止穿透到下层视图，只是不触发 `OnClickListener` 回调）！如果设置了 `OnTouchListener` 返回 `true` 对 disabled View 同样不回调监听（`dispatchTouchEvent` 直接跳过 `OnTouchListener` 转入 `onTouchEvent`）。
- **追问 2**：为什么点击同一行多个重叠按钮只有最上面的能响应，怎么让下层 View 也同时感知？
  - 关键词：默认 `ViewGroup` 逆序遍历子视图（后添加/Z 轴高的先检查），命中消费即 `break` 停止；想下层感知需外层自定义容器遍历分发或不消费返回 `false`。

## 延伸参考

参考 Android 官方 ViewGroup 触摸事件指南与 Gityuan 事件分发源码分析巩固 `dispatchTransformedTouchEvent` 细节。
