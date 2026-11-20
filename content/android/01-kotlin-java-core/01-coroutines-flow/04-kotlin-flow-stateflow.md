---
id: android.kotlin-flow-stateflow
aliases:
  - kotlin-flow-stateflow
title: Flow 冷流、StateFlow 与 SharedFlow 原理及生命周期安全采集
summary: 理解冷流按需生产与背压操作符差异，掌握 StateFlow/SharedFlow 热流语义及 Android 端 repeatOnLifecycle 防后台泄漏规范。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 6
status: published
keywords:
  - 冷流与热流
  - 背压 buffer/conflate
  - StateFlow
  - SharedFlow
  - repeatOnLifecycle
references:
  - title: Android Developers - Kotlin flows on Android
    url: https://developer.android.com/kotlin/flow
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - StateFlow and SharedFlow
    url: https://developer.android.com/kotlin/flow/stateflow-and-sharedflow
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **本质区分**：普通 `Flow` 是**冷流（Cold）**——只有调用末端操作符 `collect()` 时生产端代码块才开始执行，且一对一服务每个收集者；`SharedFlow`/`StateFlow` 是**热流（Hot）**——无论有没有订阅者都可存在并向多个订阅者广播。
- **选型落地**：**UI 持久状态用 `StateFlow`**（必须有初始值、自带结构去重 `distinctUntilChanged`、新订阅者立刻拿最新状态）；**一次性事件用 `SharedFlow`（`replay = 0`）或 `Channel`**。
- **Android 必避大坑**：在 `Activity/Fragment` 中切勿直接用 `launchWhenStarted`（退后台仅暂停不释放上游传感器/轮询），必须用 **`repeatOnLifecycle(Lifecycle.State.STARTED)`** 或 Compose **`collectAsStateWithLifecycle()`**。

## 核心原理解析

### 1. 冷流 `Flow` 与背压（Backpressure）控制
默认 `flow { emit(...) }` 与 `collect { ... }` 运行在同一个协同序列中，天然具备挂起背压（下游未处理完，上游 `emit()` 会挂起等待）。当上下游速率不匹配时常用三类操作符调控：
- **`buffer()`**：引入 `Channel` 缓冲区让上下游并发运行，不丢数据；
- **`conflate()`**：下游忙时仅保留最新值，丢弃中间来不及消费的旧数据（适合进度条/高频状态刷新）；
- **`collectLatest()`**：新数据到来时**取消正在执行中的旧收集代码块**，立即响应最新值（经典用于搜索框联想防抖后只处理最新请求）。

### 2. `StateFlow` vs `SharedFlow` 核心机制
- **`SharedFlow`**：基于环形数组缓冲支持配置 `replay`（重放个数）、`extraBufferCapacity` 和 `BufferOverflow` 溢出策略，**相同值连续发射不会自动去重**。
- **`StateFlow`**：特化版 `SharedFlow`（相当于 `replay = 1` + 强制初始值 + 基于 `equals()` 防抖去重 + `DROP_OLDEST` 策略）。若需多次触发同一种提示（如反复弹出同一个 Toast），不能直接放进 `StateFlow`。

### 3. `flowOn` 与 `catch` 作用域
- **`flowOn(Dispatchers.IO)`**：**仅作用于上游**，不影响下游收集所在线程；
- **`catch { ... }`**：同样**仅捕获上游异常**，下游 `collect` 内部抛出的异常需用 `onEach` 配合 `catch` 或外层 `try-catch` 处理。

## 图解流程

| 维度 | 普通 `Flow` | `StateFlow` | `SharedFlow` | `LiveData` |
| :--- | :--- | :--- | :--- | :--- |
| **冷 / 热属性** | 冷流（按需启动） | 热流（广播共享） | 热流（广播共享） | 热观察者 |
| **初始值** | 无 | **必须有** | 可无 | 可无 |
| **粘性重放** | 每次重新跑生产逻辑 | 固定重放最新 1 条 (`replay=1`) | 可配 `replay >= 0` | 默认粘性最新 1 条 |
| **相等值去重** | 需手加 `distinctUntilChanged` | **内置默认去重** | 不去重 | 不去重 |
| **生命周期感知** | 配合 `repeatOnLifecycle` | 配合 `repeatOnLifecycle` | 配合 `repeatOnLifecycle` | 原生绑定 `LifecycleOwner` |

## 高频追问与关键词

- **追问 1**：为什么官方弃用 `launchWhenStarted` 并强制推荐 `repeatOnLifecycle(STARTED)`？
  - 关键词：`launchWhenStarted` 在进入后台时只是“暂停协程挂起”，上游如果正连接定位监听、长连接或热流 `shareIn(WhileSubscribed(5000))`，订阅引用并未解除会持续耗电；`repeatOnLifecycle` 在 `onStop` 时真正取消收集协程、`onStart` 时重启收集。
- **追问 2**：ViewModel 中使用 `stateIn(..., SharingStarted.WhileSubscribed(5000), init)` 的 `5000ms` 是做什么的？
  - 关键词：屏幕旋转配置重建通常在几百毫秒内完成，设置 5 秒缓冲窗口可避免短暂重建期间上游流被销毁后立刻重新拉取网络数据，而真正退后台超过 5 秒才停止上游生产。
- **追问 3**：如何防止 `MutableStateFlow` 暴露给 UI 层被意外修改？
  - 关键词：`asStateFlow()` 只读视图包装（注意强转防御或私有 backing property）。

## 延伸参考

参考 Android 官方 Flow 与 `StateFlow/SharedFlow` 最佳实践文档，重点复习 `WhileSubscribed(5000)` 与生命周期采集模板。
