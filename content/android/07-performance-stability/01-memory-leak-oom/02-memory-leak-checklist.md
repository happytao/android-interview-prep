---
id: android.memory-leak-checklist
aliases: []
title: 高频内存泄漏场景排查清单与内存优化实战
summary: 汇总 Android 日常开发中八大高频内存泄漏元凶（内部类、单例 Context、监听器、动画、WebView 等）及内存抖动治理的标准化模板。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - 非静态内部类与匿名回调
  - 单例持 Activity Context
  - 广播/RxJava/EventBus 未解绑
  - 属性动画与 WebView 泄漏
  - 内存抖动与 GC 频次治理
references:
  - title: Android Developers - Overview of memory management
    url: https://developer.android.com/topic/performance/memory-overview
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Inspect your app's memory usage with Memory Profiler
    url: https://developer.android.com/studio/profile/memory-profiler
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **内存泄漏本质**：**长生命周期对象**（如静态变量、进程单例、工作线程、`MessageQueue`）意外持有了**短生命周期对象**（通常是 `Activity`/`Fragment`/`View`）的强引用，导致页面关闭后本该销毁的大片视图树和 Bitmap 无法被 GC 回收。
- **区分两个高频概念（内存泄漏 vs 内存抖动）**：
  - **内存泄漏（Memory Leak）**：可用堆水位**阶梯式只升不降**，最终挤爆上限 OOM；
  - **内存抖动（Memory Churn）**：短时间（比如在 `onDraw()` / `onBindViewHolder()` / 滚动监听循环里）疯狂分配大量临时小对象又很快抛弃，触发**锯齿状频繁 Young GC**，每次 GC 都引起轻微卡顿掉帧。

## 核心原理解析

### 1. 八大经典内存泄漏场景与标准根治姿势
1. **非静态内部类 / 匿名 `Handler` / 匿名 `Runnable`**：Java/Kotlin 中非静态内部类默认隐式持有外部 `Activity` 引用。若向主线程发了一个 3 分钟延迟任务，页面关闭 3 分钟内全部视图泄漏。→ 改用 **静态内部类 + `WeakReference` + `onDestroy` 清理**，或改用绑定了生命周期的 **`lifecycleScope`**。
2. **单例 / 全局管理类传入 `Activity` Context**：工具类 `ToastUtils`/`DbHelper` 单例接了 `this`（Activity）。→ 构造器内部第一时间强制转存 **`context.applicationContext`**。
3. **观察者 / 系统监听忘记反注册**：动态注册的 `BroadcastReceiver`、`SensorManager`、`LocationListener`、`EventBus`、`ContentObserver`、`ViewTreeObserver` 监听未在 `onStop`/`onDestroy` 移除（或改用 **`DefaultLifecycleObserver` 自动配对解绑**）。
4. **Fragment `ViewBinding` 未在 `onDestroyView()` 置空**：Fragment 进回退栈时视图销毁但 Fragment 实例仍存，不置空 `binding = null` 整棵老 View 树及加载的大图一直占着堆。
5. **无限循环属性动画**：`ObjectAnimator.INFINITE` 挂在主线程 `AnimationHandler` 里且引着 View，`onDestroy` 必须调 `animator.cancel()`。
6. **未关闭的资源与游标**：`Cursor`、`FileInputStream`、`TypedArray`、`Parcel`、数据库连接忘记 `close()` / `recycle()`（Kotlin 用 **`.use { ... }`** 自动托管防漏）。
7. **原生 `WebView` 强关联历史大坑**：早期系统版本 `WebView` 内部向系统级服务注册监听易永久卡死宿主 Activity。→ **动态代码传入 `ApplicationContext`（注意部分弹框兼容性）创建进占位容器**，退出时 `removeAllViews()` + `destroy()`，重度业务直接放独立 `:web` 进程。
8. **静态 `View` / `Drawable` 缓存**：早期把静态 `Drawable` 绑给 `ImageView` 后，`Drawable.setCallback(imageView)` 会悄悄反向强引用住整个视图和 Activity。

## 图解流程

| 泄漏类型 / 性能问题 | 典型强引用链条 | 线下标定 / 线下工具 | 推荐根治方案 |
| :--- | :--- | :--- | :--- |
| **Handler / Thread 任务未清** | `MainLooper → Msg → target → Activity` | LeakCanary / Profiler | `lifecycleScope` 托管或 `removeCallbacksAndMessages(null)` |
| **单例持有页面引用** | `Static Singleton → Activity → DecorView` | LeakCanary | 统一强制使用 `context.applicationContext` |
| **Fragment 视图缓存泄漏** | `BackStack Fragment → binding → View 树` | LeakCanary | `onDestroyView()` 置空 `_binding = null` |
| **内存抖动 (Memory Churn)** | `onDraw`/`onScroll` 频繁 `new Paint/Rect/StringBuilder` | **Memory Profiler 分配追踪** | 对象抽离成成员变量预分配复用（`StringBuilder`/`Rect` 池） |

## 高频追问与关键词

- **追问 1**：线上怎么区分一个问题到底是内存泄漏还是正常的业务峰值大图触发 OOM？
  - 关键词：看内存曲线趋势与堆占比。利用 Android Profiler 或线上 `Debug.getMemoryInfo` / Java Heap 采样监控：如果**反复进出同一页面后 Java Heap 经过 GC 后的基线水位呈阶梯单调递增**（`retained heap` 持续上涨），必有泄漏；如果是瞬间加载单张超分辨率未压缩大图或同时弹出十几张帧动画导致脉冲刺破上限，则属于瞬时峰值超限。
- **追问 2**：Kotlin 中看似无害的高阶函数或匿名 `object : Callback {}` 会不会造成泄漏？
  - 关键词：只要匿名内部类/Lambda 捕获了外层的 `this`（比如在方法里更新了一个 TextView 或调了 Activity 方法），编译后就会在匿名对象里生成 `this$0` 字段持有整个 Activity；交给长生命周期后台线程或单例回调池后同样会泄漏。

## 延伸参考

参考 Android Developers Memory Management 与 Memory Profiler 实战文档。
