---
id: android.compose-state-side-effects
aliases: []
title: Compose 状态管理与副作用控制（remember、derivedStateOf、LaunchedEffect）
summary: 理清状态提升原则、Snapshot 状态快照系统、rememberSaveable 跨配置恢复、derivedStateOf 降频派生，以及各类 SideEffect API 的生命周期边界。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 6
status: published
keywords:
  - Snapshot 状态快照
  - remember vs rememberSaveable
  - derivedStateOf 降频过滤
  - LaunchedEffect / DisposableEffect
  - rememberUpdatedState
references:
  - title: Android Developers - State and Jetpack Compose
    url: https://developer.android.com/develop/ui/compose/state
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Side-effects in Compose
    url: https://developer.android.com/develop/ui/compose/side-effects
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **状态记忆双剑客**：`remember` 把值存进当前组合的 `SlotTable` 跨越多次重组不重置，但**遇屏幕旋转或被系统回收重建会清空**；`rememberSaveable` 在此之上接入宿主 `SavedStateRegistry` 自动保存进 Bundle，**可跨旋转与进程被杀恢复**（支持基本类型、Parcelable 或自定义 `Saver`）。
- **高频降频利器（`derivedStateOf` vs `remember(key)`）**：当输入高频变动（如 `LazyListState.firstVisibleItemIndex` 每滑一点狂跳），而你只关心**布尔阈值变化**（如 `index > 0` 是否显示“回到顶部”悬浮按钮）时，用 **`derivedStateOf`** 把 100 次滑动收敛成仅越界瞬间的 1 次状态通知！反之若派生输出随输入每次都要变，直接用 `remember(input)` 计算即可，别乱套 `derivedStateOf`。
- **副作用安全边界**：所有在 Composable 生命周期内发协程、注册系统回调、读最新 Lambda 的动作必须使用对应 Effect API 精确绑定组合的进入（Enter）与退出（Leave）销毁。

## 核心原理解析

### 1. Snapshot（状态快照系统）如何感知状态变化？
`mutableStateOf()` 创建的状态依托 Compose **Snapshot MVCC 多版本快照系统**：当你在任一 `Snapshot`（包括当前 UI 线程或事务快照）修改 `state.value` 时，框架会追踪“哪个 `RecomposeScope` 在组合阶段读取过该对象”，提交快照时精准标脏对应的作用域并调度下一帧重启刷新，而绝不会无脑全局刷新整棵界面树。

### 2. 四大核心副作用（Side-Effect）API 精准区分
- **`LaunchedEffect(key1, ...)`**：进入组合时在受管 `CoroutineScope` 内启动协程，**退出组合自动取消**；当传入的 `key` 发生变更时先取消旧协程再启动新协程（注意只跑一次时可传 `Unit`，但依赖外部可变 callback 需配合 `rememberUpdatedState`）；
- **`DisposableEffect(key1, ...)`**：专用于**需要配对解绑清理的同步监听**（如 `LifecycleOwner` 注册、`BroadcastReceiver`、`ViewTreeObserver`），强制要求末尾写 `onDispose { ... }` 释放资源；
- **`SideEffect {}`**：在**每次成功重组完成之后**执行，常用于把 Compose 的状态同步发给非 Compose 管理的外部对象（如系统状态栏颜色或埋点库）；
- **`rememberCoroutineScope()`**：返回一个绑定在调用点组合生命周期内的协程作用域，专门用于在 **非 Composable 的用户点击回调 `onClick = { scope.launch { ... } }` 中启动协程**（严禁把 `LaunchedEffect` 塞进 `onClick` 里，甚至会编译报错！）。

## 图解流程

| API 名称 | 触发执行时机 | 取消 / 清理时机 | 典型应用案例 |
| :--- | :--- | :--- | :--- |
| **`remember { ... }`** | 首次进入组合时计算缓存 | 离开组合（从界面树移除） | 缓存 `Animatable`、状态对象、派生辅助类 |
| **`rememberSaveable { ... }`** | 同 `remember` + 可从 Bundle 恢复 | 手动销毁或页面真正出栈 | 输入框文本、筛选下标、跨旋转保留状态 |
| **`derivedStateOf { ... }`** | 内部读到的高频 `State` 改变且**输出值真发生变化**时 | 跟随外围 `remember` 销毁 | 监听列表滚动显示“回到顶部”按钮、校验表单是否可点击 |
| **`LaunchedEffect(key)`** | 进入组合或 `key` 改变时启动协程 | 退出组合或 `key` 变更自动 `cancel` | 弹窗倒计时、进页面拉取动画、收集一次性事件流 |
| **`DisposableEffect(key)`** | 进入组合或 `key` 改变时同步执行 | 退出组合或 `key` 变更调 **`onDispose`** | 注册/注销 `LifecycleObserver`、传感器、播放器 |
| **`rememberUpdatedState(val)`** | 每次重组即时更新最新引用值 | — | 在长耗时 `LaunchedEffect(Unit)` 结尾安全回调最新的 `onTimeout` 闭包 |

## 高频追问与关键词

- **追问 1**：为什么 `LaunchedEffect(Unit)` 里面直接引用外层参数 `onFinish: () -> Unit`，等 3 秒动画结束回调时执行到的可能是旧版闭包？怎么修？
  - 关键词：因为 `key` 是常量 `Unit`，即使父组件重组传进了新的 `onFinish` Lambda，`LaunchedEffect` 不会重启依然拿着首次捕获的旧闭包！必须包一层 **`val currentOnFinish by rememberUpdatedState(onFinish)`** 并在 `LaunchedEffect` 内部调 `currentOnFinish()`。
- **追问 2**：什么叫 **状态提升（State Hoisting）**？好处是什么？
  - 关键词：把子 Composable 内部状态提取到父级或 `ViewModel`，子组件只接收只读 **`value: T`** 和修改回调 **`onValueChange: (T) -> Unit`**，变成**无状态（Stateless）纯 UI 组件**，从而实现单一可信数据源、组件极易复用与单元测试友好。

## 延伸参考

对照 Android Developers Compose State 与 Side-effects 官方文档核对各 Effect 触发矩阵。
