---
id: android.arch-mvc-mvp-mvvm-mvi
aliases: []
title: MVC / MVP / MVVM / MVI 架构演进与单向数据流（UDF）最佳实践
summary: 对比客户端四大架构演进逻辑与耦合痛点，深入阐述基于 StateFlow + 不可变 UiState + Reducer 的 MVI 单向数据流（UDF）工程落地最佳实践。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 7
status: published
keywords:
  - MVC / MVP / MVVM / MVI
  - 单向数据流 (UDF)
  - 唯一可信数据源 SSOT
  - 不可变 UiState
  - UiEvent / SideEffect 防重防丢
references:
  - title: Android Developers - Guide to app architecture
    url: https://developer.android.com/topic/architecture
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - UI Layer & UDF
    url: https://developer.android.com/topic/architecture/ui-layer
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **演进主线（一直在解“视图与逻辑解耦 + 状态可控”问题）**：
  - **MVC**：`Activity/Fragment` 同时兼任 View 与 Controller，动辄上千行变成超级上帝类（God Object）；
  - **MVP**：抽离 `Presenter` 与 `View` 接口彻底解耦、方便单测，但**海量接口膨胀（Contract 地狱）**且 Presenter 互持引用极易忘解绑引发内存泄漏；
  - **MVVM**：引入 `ViewModel` + 数据绑定（`LiveData`/`StateFlow`），消除了接口回调且跨旋转存活；但复杂页面常常同时暴露七八个分散的 `StateFlow`（`isLoading`/`list`/`isEmpty`/`error`），很容易彼此互斥冲突产生“既转圈又显示报错”的非法中间态；
  - **MVI（单向数据流 UDF）**：将界面全量状态收敛为**唯一一个不可变 `UiState` 数据类**，用户动作封装为 **`Intent / Action`** 流入 ViewModel，经过纯函数逻辑 / Repository 更新生成全新 `UiState` 快照向下驱动 UI，彻底消灭状态撕裂。

## 核心原理解析

### 1. Android 现代架构分层与单向数据流（UDF）最佳实践
遵循 Google 官方架构指南的三层单向结构：**UI Layer（Activity/Compose + ViewModel） → Domain Layer（可选 UseCase 复用复杂业务） → Data Layer（Repository + Remote/Local DataSource）**：
1. **状态向上收拢，数据向下流动**：UI 绝不直接改 State 字段，只能调用 `viewModel.onAction(UiAction.Refresh)` 或暴露语义方法；
2. **唯一可信数据源（SSOT）**：离线优先业务由 Room 本地库充当唯一可信源，网络返回先写库再自动驱动 `Flow` 刷新 UI，避免网络缓存与本地状态两套打架；
3. **原子不可变 `UiState` 更新**：永远在 `MutableStateFlow` 中使用 **`_uiState.update { it.copy(...) }`**（内部基于 CAS 原子循环防止多线程并发改同一个字段互相覆盖丢失！）。

### 2. 一次性能事件（SideEffect：弹窗/Toast/导航）在 UDF 中如何防重防丢？
这是高频追问的核心实战问题，两种成熟方案对比：
- **官方首推（Event as State）**：把弹窗/错误提示作为 `UiState` 的一部分（例如 `toastMessage: String?` 或带唯一 UUID 的消息队列），UI 展示完毕立即调用 `viewModel.consumeToast()` 将其置为 `null`；优点是**绝不会因为界面切后台再回来而丢失消息**，且完全符合状态快照原则；
- **通道模式（`Channel(Channel.BUFFERED)`）**：用于纯跳转路由等无需持久保留的瞬态动作，在 `repeatOnLifecycle(STARTED)` 唯一单播接收，避免 `LiveData` 粘性二次弹出或 `SharedFlow(replay=0)` 后台丢失。

## 图解流程

| 维度 | `MVC` | `MVP` | `MVVM` | `MVI` (UDF 最佳实践) |
| :--- | :--- | :--- | :--- | :--- |
| **视图通信方式** | 互相直调混合 | `Presenter` 持有 `IView` 接口双向直调 | `View` 观察 `ViewModel` 暴露的多个流 | **Action/Intent 上行 → 单一不可变 `UiState` 下行** |
| **配置变更安全性** | 差 | 差（需自行留存 Presenter） | **优**（`ViewModel` 天然存活） | **优**（唯一快照无缝还原） |
| **状态一致性** | 极易混乱 | 靠人工时序控制 | 多流并发容易冲突撕裂 | **强一致（单个 `data class` 状态机约束）** |
| **样板代码与学习成本** | 低 | 高（接口地狱） | 适中 | 略高（小简单页可用轻量化 MVVM+UDF 思想折中） |

## 高频追问与关键词

- **追问 1**：是不是所有小页面（比如一个简单的“关于我们”或纯设置页）都要严格写一套庞大的 `UiIntent`、`Reducer`、`Effect`？
  - 关键词：切忌过度设计！Google 官方建议落地 **“MVVM + UDF 思维”**：简单页面不用强行包一层巨大的 `Intent` 密封类和 `Reducer` 转发，直接暴露规范命名的语义方法（如 `onToggleDarkTheme()`）+ **收敛单一不可变 `UiState`** + `.update { it.copy(...) }` 即可兼顾开发效率与状态绝对安全。
- **追问 2**：为什么 `_uiState.value = _uiState.value.copy(...)` 在高并发异步协程里是不安全的？
  - 关键词：非原子读-改-写，两条同时跑的协程读取到同一份旧 `value` 各自修改不同字段后覆写，后写入的会抹掉前一个字段的更新；必须使用 **`_uiState.update { cur -> cur.copy(...) }`** 基于 CAS 乐观锁自旋合并最新状态。

## 延伸参考

参考 Android Developers 官方 App Architecture 指南与 UI Layer UDF 最佳实践规范。
