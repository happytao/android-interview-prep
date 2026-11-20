---
id: android.android-design-patterns
aliases: []
title: Android 源码中的高频设计模式实战（单例、Builder、工厂、代理、责任链、观察者、享元）
summary: 将经典设计模式直接映射到 Android Framework 与主流开源库真实源码（DCL 单例、Dialog Builder、Retrofit 代理、OkHttp 责任链、Message 享元、ContextWrapper 装饰器），拒绝死背概念。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 6
status: published
keywords:
  - DCL + volatile 单例
  - AlertDialog Builder
  - Retrofit 动态代理
  - OkHttp 责任链
  - Message.obtain() 享元
references:
  - title: Android Developers - Retrofit & OkHttp Overview / App Architecture
    url: https://square.github.io/okhttp/features/interceptors/
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - ContextWrapper
    url: https://developer.android.com/reference/android/content/ContextWrapper
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **面试高分策略**：切忌光干巴巴背诵“23 种设计模式定义”，面试官更想听你**直接举出 Android SDK 或主流三方库里对应模式的经典源码落地与为什么这样选型**！
- **七大核心高频模式速览**：
  1. **单例模式**（`DCL + volatile` / 静态内部类 / Kotlin `object` / `WindowManagerGlobal`）；
  2. **建造者 Builder**（`AlertDialog.Builder` / `OkHttpClient.Builder` / `NotificationCompat.Builder`）；
  3. **工厂模式**（`BitmapFactory` / `ViewModelProvider.Factory` / Retrofit `Converter.Factory`）；
  4. **动态代理**（`Retrofit.create()` 结合 `Proxy.newProxyInstance` 拦截接口方法生成请求）；
  5. **责任链模式**（`OkHttp` 拦截器链、`ViewGroup` 触摸事件分发、`Try-Catch` 异常链）；
  6. **观察者模式**（Jetpack `Lifecycle`、`LiveData`/`Flow`、`RecyclerView.AdapterDataObserver`、`ContentObserver`）；
  7. **装饰器 & 享元模式**（`ContextWrapper` 包装 `ContextImpl` 与 Okio `ForwardingSource` 是装饰器；`Message.obtain()` 复用品池与 `RecyclerViewPool` 是享元）。

## 核心原理解析

### 1. 手写线程安全单例的三种首选及 `volatile` 作用
- **Kotlin 原生最简洁**：`object Singleton`（底层编译为静态代码块 `static {}` 类加载期由 JVM 保证唯一且线程安全）；若需要传参初始化则用伴生对象写 **`DCL`（双重校验锁）**；
- **Java DCL 为什么必须加 `volatile`？**：`instance = new Singleton()` 在指令层并非原子操作（① 分配内存 → ② 调构造器初始化字段 → ③ 引用指向内存）；没有 `volatile` 时 CPU/编译器可能把 ③ 提前到 ② 之前，导致线程 B 判非空直接拿到一个**内部字段全为默认零值的半初始化残缺对象**而崩溃！

### 2. 代理模式 vs 装饰器模式本质区别（极常追问对比）
两者结构极其相似（都实现同一接口并持有目标对象引用），区别在**意图与可见性**：
- **装饰器模式**（如 `ContextWrapper` 包装 `ContextImpl`、Java IO `BufferedInputStream`）：重点在**透明叠加增强职责**，由调用方把原始对象传进去动态多层嵌套组装；
- **代理模式**（如 `Binder Proxy`、`Retrofit` 动态代理）：重点在**访问控制、隔离屏蔽或远程转发**，客户端往往感知不到底层被代理对象的创建细节（甚至如 Retrofit 接口压根没有实体实现类！）。

## 图解流程

| 设计模式 | Android / 三方库经典源码案例 | 解决的核心工程痛点 |
| :--- | :--- | :--- |
| **单例模式 (`DCL/object`)** | `InputMethodManager`、`WindowManagerGlobal`、`Retrofit` 客户端 | 节省重型对象内存与线程池，确保全局状态唯一 |
| **建造者 (`Builder`)** | `AlertDialog.Builder`、`OkHttpClient.Builder`、`Glide RequestOptions` | 优雅解决几十个可选构造参数导致构造器爆炸与对象不可变性 |
| **动态代理 (`Proxy`)** | `Retrofit.create(Api::class.java)`、`AIDL Proxy/Stub` | 零样板实现类，运行期统一拦截方法注解并转发底层通信 |
| **责任链 (`Chain`)** | `OkHttp Interceptor`、View 触摸事件分发 U 型链 | 将复杂多步处理解耦为独立节点，支持动态插拔与半路截断返回 |
| **观察者 (`Observer`)** | Jetpack `Lifecycle`、`Flow`、`AdapterDataObserver` | 消除轮询，让数据/生命周期源头与多处 UI 自动联动并解耦 |
| **装饰器 (`Decorator`)** | `ContextWrapper` → `ContextImpl`、Okio `ForwardingSink` | 不修改原类也不引发继承爆炸的前提下，灵活组合扩展能力 |
| **享元模式 (`Flyweight`)** | `Message.obtain()` 对象池、`Okio SegmentPool`、`RecycledViewPool` | 高频短生命周期对象池化复用，极大降低 GC 频次与界面抖动 |

## 高频追问与关键词

- **追问 1**：策略模式和状态模式在代码结构上长得几乎一样，Android 里分别有什么案例？怎么区分？
  - 关键词：**策略模式**聚焦由调用方自由切换可互换算法（如属性动画的 `TimeInterpolator`、`Glide DiskCacheStrategy`、`Retrofit CallAdapter`）；**状态模式**聚焦对象内部状态自己随行为流转自动切到下一态且互知转换条件（如 `Lifecycle` 状态机、`MediaPlayer` 状态机或下载任务状态流转）。
- **追问 2**：Android 开发中适配器模式（Adapter）典型体现在哪里？
  - 关键词：`RecyclerView.Adapter` 把任意异构业务数据模型列表统一适配转换给 `RecyclerView` 的标准化 `ViewHolder` 绑定展示接口。

## 延伸参考

结合 Android 官方 `ContextWrapper`、OkHttp 拦截器设计及 Retrofit 源码印证各模式落地边界。
