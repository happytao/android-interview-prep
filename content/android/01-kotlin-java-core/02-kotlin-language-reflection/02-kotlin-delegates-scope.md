---
id: android.kotlin-delegates-scope
aliases:
  - kotlin-delegates-scope
title: 委托属性（by lazy、Delegates.observable）与作用域函数差异
summary: 委托属性通过编译生成属性代理字段将读写转交 getValue/setValue，by lazy 默认使用同步锁模式；作用域函数按上下文与返回值区分适用场景。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - by lazy
  - LazyThreadSafetyMode
  - ReadWriteProperty
  - let/run/with/apply/also
  - 作用域函数
references:
  - title: Kotlin 官方文档 - Delegated properties
    url: https://kotlinlang.org/docs/delegated-properties.html
    type: official
    verifiedAt: "2026-11-20"
  - title: Kotlin 官方文档 - Scope functions
    url: https://kotlinlang.org/docs/scope-functions.html
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **委托属性本质**：`by` 关键字在字节码层面生成一个名为 `<prop>$delegate` 的私有隐藏字段，所有对该属性的 `get/set` 调用都会转译为调用代理对象的 `getValue()` / `setValue()` 运算符方法（支持借助 `provideDelegate` 在绑定期校验属性名）。
- **`by lazy` 线程模式**：默认 `SYNCHRONIZED`（内部双重校验锁），主线程 UI 控件或 ViewModel 初始化强烈建议使用 `LazyThreadSafetyMode.NONE` 免除无谓锁开销。
- **作用域函数记法口诀**：看两点即可零混淆——**引用对象是 `this` 还是 `it`**，以及**返回值是“对象本身”还是“最后一行表达式结果”**。

## 核心原理解析

### 1. 委托（Delegation）与常用标准委托
- **类委托 (`by`)**：编译期自动生成全部接口转发方法，比继承更解耦（装饰器模式极简写法）；
- **`by lazy`**：仅适用于 `val`，首次读取才执行初始化 Lambda 并缓存结果；提供三种线程模式：
  - `SYNCHRONIZED`（默认，双重校验锁保证单次初始化）
  - `PUBLICATION`（允许并发多次计算，CAS 保证只采纳最先完成的结果）
  - `NONE`（无锁开销，严格限定单线程如主线程 View 初始化使用，性能最优）
- **`Delegates.observable` / `vetoable`**：监听属性变更前后回调，`vetoable` 可通过返回 `false` 拦截拒绝本次赋值；
- **Android 实战应用**：`by viewModels()`、`by activityViewModels()` 本质都是返回 `Lazy<VM>` 委托，延迟到实际读取且宿主生命周期就绪后才从 `ViewModelStore` 获取实例。

### 2. 五大作用域函数选型规范
核心避免过度嵌套导致 `this` 与 `it` 指代混乱，遵循团队约定：
- **对象配置 / 链式构建** → `apply`（`this`、返回自身）
- **附加副作用（打日志、校验上报）** → `also`（`it`、返回自身）
- **空安全检查与局部转换** → `let`（`it`、返回 Lambda 结果，配合 `?.let`）
- **对象内部计算后得出结果** → `run` / `with`（`this`、返回 Lambda 结果；`with` 非扩展函数常用于 View 属性集中赋值）

## 图解流程

| 作用域函数 | 内部上下文引用 | 返回值 | 是否为扩展函数 | 典型工程用途 |
| :--- | :---: | :---: | :---: | :--- |
| **`let`** | `it` | Lambda 末行结果 | 是 | `nullable?.let { ... }` 判空、数据映射 |
| **`run`** | `this` | Lambda 末行结果 | 是（另有无参 `run {}`） | 初始化对象并直接计算返回一个衍生结果 |
| **`with`** | `this` | Lambda 末行结果 | 否（传参调用） | `with(binding) { ... }` 集中操作非空对象 |
| **`apply`** | `this` | **调用对象本身** | 是 | 构建配置 `Intent().apply { putExtra(...) }` |
| **`also`** | `it` | **调用对象本身** | 是 | 不破坏链式返回值插入日志、校验、赋值前置回调 |

## 高频追问与关键词

- **追问 1**：`Fragment` 中使用 `by lazy` 缓存 `View` 引用或 `Adapter` 会有什么隐患？
  - 关键词：Fragment 视图销毁重建（`onDestroyView` 后 `onCreateView` 重走）但 Fragment 实例未销毁，`by lazy` 只初始化一次会持有已销毁的旧 `View` 引发内存泄漏或界面不刷新。
- **追问 2**：`lateinit var` 与 `by lazy` 的核心区别是什么？
  - 关键词：`lateinit` 只用于可变 `var`（不能修饰基础类型如 `Int`），可检查 `::prop.isInitialized`，适合外部依赖注入；`by lazy` 只用于不可变 `val`，首次访问自动惰性求值，支持基本类型。

## 延伸参考

参考 Kotlin 官方 Delegated Properties 与 Scope Functions 规范整理项目编码风格指南。
