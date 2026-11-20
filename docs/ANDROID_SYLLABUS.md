# Android 中级开发工程师面试知识大纲（Phase 1 · 对抗审核修订待批稿）

> **审阅与调整指引**  
> 1. 本大纲已结合 **`claude-opus-5-5-high`** 对抗审核意见完成深度校准，对标 **2–5 年经验 Android 中级工程师**主流面试要求（覆盖网络协议、ClassLoader/热修复、Jetpack Compose 独立专题、Baseline Profiles、Android 10–16 适配与高频场景/算法）。  
> 2. 题目标注已收敛：**`高频必考` 控制在约 29%（26/89 题）**，其余为 `核心常考` 与 `中级加分`，方便聚焦最核心必背骨肉；题号采用**不可变语义 ID**（如 `android.handler-epoll`），增删或调序不会影响个人笔记与复习进度。  
> 3. 请审阅下方 **9 大一级分类、30 个二级专题、89 道核心题**，并在文末**「候选扩展池」**中按需勾选补充方向；你可以直接回复告诉我**保留、删除、合并或新增**哪些具体内容，确认后立即进入 Phase 2 实施！

---

## 知识全景总览

| 序号 | 一级分类（L1） | 二级专题（L2） | 题目数 | 高频必考 | 图解分配（5 旗舰交互 SVG + Mermaid + 对比表） | 核心考察聚焦 |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| 01 | Kotlin 与 Java 核心基础 | 3 | 12 | 4 | 7 Mermaid · 5 对比表 | 协程状态机、结构化并发、泛型/APT/KSP、ART 锁与 GC |
| 02 | Android 四大组件与生命周期 | 3 | 8 | 3 | 7 Mermaid · 1 对比表 | 生命周期交错、任务栈、冷启动全链路与后台服务合规 |
| 03 | Android Framework 核心机制 | 4 | 12 | 4 | **2 交互 SVG** · 5 Mermaid · 5 对比表 | Handler/epoll、Binder mmap、ClassLoader 与热修复 |
| 04 | View 渲染、事件分发与自定义 View | 4 | 10 | 4 | **2 交互 SVG** · 5 Mermaid · 3 对比表 | U 型事件分发、VSync 渲染、RecyclerView 缓存与动画 |
| 05 | Jetpack 组件、Compose 与主流架构 | 4 | 13 | 3 | 7 Mermaid · 6 对比表 | Lifecycle/ViewModel、Compose 重组与状态、Room/Navigation、UDF |
| 06 | 网络通信、协议与主流三方库 | 4 | 11 | 3 | **1 交互 SVG** · 6 Mermaid · 4 对比表 | TCP/TLS/HTTP3、OkHttp 拦截链、Glide 4 缓存、MMKV/DataStore |
| 07 | 性能优化与稳定性治理 | 3 | 8 | 3 | 6 Mermaid · 2 对比表 | LeakCanary/内存/FD 排查、Baseline Profiles、ANR 与 Crash 闭环 |
| 08 | 工程化、构建、安全与适配 | 3 | 8 | 1 | 3 Mermaid · 5 对比表 | APK 构建签名、R8 瘦身、ASM 路由、屏幕与 Android 10–16 适配 |
| 09 | 算法与客户端高频场景题 | 2 | 7 | 1 | 6 Mermaid · 1 对比表 | LRU/多线程/View 树、Hot100 题型模式、断点续传/Feed/IM 场景 |
| **合计** | **9 个一级分类** | **30 个二级专题** | **89 题** | **26 题 (29.2%)** | **5 旗舰交互 SVG + 52 Mermaid + 32 对比表** | **（其余 Mermaid 图后续可按需渐进升级为交互 SVG）** |

---

## 01 · Kotlin 与 Java 核心基础（12 题）

### 01-01 Kotlin 协程与挂起原理（4 题）
1. `android.kotlin-suspend-cps` · **Kotlin 协程本质与 `suspend` 挂起/恢复（CPS 状态机）原理** `高频必考` `Mermaid`
   - 核心关键词：轻量级调度抽象、`Continuation` 回调、`label` 状态机、`COROUTINE_SUSPENDED`、非阻塞挂起
2. `android.kotlin-structured-concurrency` · **`CoroutineScope`、结构化并发与异常传播（`Job` vs `SupervisorJob`）** `核心常考` `Mermaid`
   - 核心关键词：父子 Job 树、结构化取消协同、`SupervisorJob` 异常隔离、`CoroutineExceptionHandler` 生效边界
3. `android.kotlin-dispatchers-context` · **协程调度器（`Dispatchers`）切换机制与线程阻塞陷阱** `核心常考` `Mermaid`
   - 核心关键词：`ContinuationInterceptor`、`Main.immediate`、`IO`/`Default` 共享池、`runBlocking` 死锁风险
4. `android.kotlin-flow-stateflow` · **`Flow` 冷流、`StateFlow` 与 `SharedFlow` 原理及生命周期安全采集** `高频必考` `对比表`
   - 核心关键词：冷流按需触发、`buffer`/`conflate`/`collectLatest` 背压、`replay` 缓存、`repeatOnLifecycle`

### 01-02 Kotlin 语言机制与泛型反射（4 题）
5. `android.kotlin-inline-lambda` · **`inline`/`noinline`/`crossinline`、`reified` 泛型实化与 Lambda 变量捕获分配优化** `核心常考` `对比表`
   - 核心关键词：字节码内联消除 `FunctionN` 对象、非局部返回控制、`Ref.IntRef` 捕获装箱、无捕获 Lambda 单例复用
6. `android.kotlin-delegates-scope` · **委托属性（`by lazy`、`Delegates.observable`）与作用域函数差异** `核心常考` `对比表`
   - 核心关键词：`getValue`/`setValue` 编译展开、`LazyThreadSafetyMode`、`let/run/with/apply/also` 上下文与返回值
7. `android.kotlin-sealed-nullsafety` · **`sealed class/interface`、`data class` 与空安全底层实现** `核心常考` `Mermaid`
   - 核心关键词：受限继承穷尽检查、`componentN`/`copy`、Java `@Nullable` 与 `Intrinsics.checkNotNullParameter` 校验
8. `android.java-generics-apt-ksp` · **Java/Kotlin 泛型擦除（`in`/`out` 型变）、反射开销与 APT/KSP 注解处理原理** `核心常考` `对比表`
   - 核心关键词：类型擦除与桥接方法、声明处型变（`out`/`in`）vs 使用处通配符、`TypeToken`、KSP 免生成 Java 存根

### 01-03 Java 并发、容器与 ART 基础（4 题）
9. `android.jvm-art-locking-jmm` · **`synchronized`（HotSpot vs ART 锁实现）、`ReentrantLock`（AQS）与 `volatile`** `高频必考` `Mermaid`
   - 核心关键词：HotSpot Mark Word 升级（JDK 18 JEP 374 已移除偏向锁）vs ART `lock_word` Thin/Fat Lock、AQS CLH 队列、内存屏障与可见性
10. `android.java-thread-pool` · **`ThreadPoolExecutor` 核心参数、工作流程与 Android 线程池选型** `核心常考` `Mermaid`
    - 核心关键词：核心线程 → 阻塞队列 → 最大线程 → 拒绝策略、`allowCoreThreadTimeOut`、避免无界队列引发 OOM
11. `android.java-android-collections` · **`HashMap`（1.8 红黑树）、`ConcurrentHashMap` 与 `SparseArray`/`ArrayMap` 对比** `高频必考` `对比表`
    - 核心关键词：扰动散列与树化阈值 8/6、CAS + `synchronized` 桶锁、二分查找省内存装箱与扩容阈值权衡
12. `android.art-gc-references` · **ART 垃圾回收机制（可达性分析、四种引用、Concurrent Copying 与 `TLAB`）** `核心常考` `Mermaid`
    - 核心关键词：GC Roots、强软弱虚引用（`ReferenceQueue`）、ART 并发复制回收（CC）、`TLAB` 与 Region 内存碎片治理

---

## 02 · Android 四大组件与生命周期（8 题）

### 02-01 Activity 生命周期、启动模式与状态保存（4 题）
13. `android.activity-lifecycle-sequence` · **Activity 完整生命周期与 A 启动 B / 前后台切换交错时序** `高频必考` `Mermaid`
    - 核心关键词：`A.onPause` → `B.onCreate/onStart/onResume` → `A.onStop`、透明主题不触发 `onStop`、耗时操作避坑
14. `android.activity-launch-mode` · **4 种 `launchMode`、`Intent Flag` 组合与任务栈（`TaskAffinity`）调度机制** `高频必考` `Mermaid`
    - 核心关键词：`standard`/`singleTop`/`singleTask`/`singleInstance`、`onNewIntent`、`FLAG_ACTIVITY_CLEAR_TOP`
15. `android.activity-state-restore` · **配置变更重建（`onSaveInstanceState` / `Bundle` 容量限制）与进程被杀恢复** `核心常考` `Mermaid`
    - 核心关键词：API 28+ `onSaveInstanceState` 移至 `onStop` 之后、View 状态恢复 ID 要求、Binder 传输容量规避
16. `android.app-cold-start-chain` · **从桌面点击图标到 Activity 首帧显示（冷启动全链路）** `高频必考` `Mermaid`
    - 核心关键词：Launcher → `ATMS/AMS` Binder → Zygote `fork` → `ActivityThread.main` → `LoadedApk`/H Handler → `ViewRootImpl` 首帧

### 02-02 Service 与 BroadcastReceiver（2 题）
17. `android.service-lifecycle-foreground` · **`startService` vs `bindService` 生命周期差异、后台限制与前台服务适配** `核心常考` `Mermaid`
    - 核心关键词：`onStartCommand` 返回值、混合绑定销毁条件、Android 8.0 后台限制、`foregroundServiceType` 声明
18. `android.broadcast-local-replacement` · **静态/动态广播机制、`LocalBroadcastManager` 淘汰与进程内通信替代方案** `核心常考` `对比表`
    - 核心关键词：AMS 广播队列派发、`goAsync()` 超时、`LocalBroadcastManager` 弃用原因、`SharedFlow` 替代

### 02-03 ContentProvider 与 Fragment 高频机制（2 题）
19. `android.content-provider-startup` · **`ContentProvider` 跨进程数据共享与 `App Startup` 初始化合并** `核心常考` `Mermaid`
    - 核心关键词：匿名共享内存 + `CursorWindow`、先于 `Application.onCreate()` 初始化、Jetpack `App Startup` 合并加速
20. `android.fragment-lifecycle-viewpager2` · **Fragment 生命周期、`ViewPager2` 懒加载与 `commitAllowingStateLoss` 异常原理** `核心常考` `Mermaid`
    - 核心关键词：`FragmentManager` 事务与回退栈、`setMaxLifecycle(RESUMED)`、`onSaveInstanceState` 状态丢失防护

---

## 03 · Android Framework 核心机制（12 题）

### 03-01 Handler 消息机制与异步调度（4 题）
21. `android.handler-epoll` · **`Handler`、`Looper`、`MessageQueue` 协作与 Linux `pipe`/`eventfd` + `epoll` 休眠唤醒** `高频必考` `旗舰交互SVG`
    - 核心关键词：时间序单链表、`nativePollOnce`/`nativeWake`（Android 6.0 前用 `pipe`，6.0+ 切为 `eventfd`）、`Message.obtain()` 池复用
22. `android.looper-loop-no-anr` · **为什么主线程 `Looper.loop()` 死循环不会引起 ANR？** `高频必考` `Mermaid`
    - 核心关键词：无消息时内核态休眠让出 CPU、ANR 本质是特定事件未在阈值内响应、消息驱动架构模型
23. `android.sync-barrier-vsync` · **同步屏障（SyncBarrier）、异步消息与 VSync 渲染高优先级调度原理** `核心常考` `Mermaid`
    - 核心关键词：`target == null` 屏障消息、`Message.setAsynchronous(true)`、`Choreographer` 优先取帧消息、屏障及时移除
24. `android.threadlocal-idlehandler-leak` · **`ThreadLocal` 隔离原理、`IdleHandler` 触发时机与 `Handler` 内存泄漏治理** `核心常考` `对比表`
    - 核心关键词：`ThreadLocalMap` 弱引用 Key 防泄漏、`queueIdle()` 空闲延迟执行、静态内部类 + `WeakReference` + `removeCallbacksAndMessages`

### 03-02 Binder IPC 与进程模型（4 题）
25. `android.binder-mmap-onecopy` · **Binder 一次拷贝原理（`mmap` 内存映射）与传统 IPC 对比优势** `高频必考` `旗舰交互SVG`
    - 核心关键词：内核空间与接收方用户空间映射同一物理页、`copy_from_user` 仅 1 次拷贝、UID/PID 鉴权安全优势
26. `android.aidl-service-manager` · **AIDL 通信流程（Proxy/Stub、`ServiceManager`、线程池与死亡代理）** `核心常考` `Mermaid`
    - 核心关键词：`asInterface` 本地/远程分支、transact/onTransact、Binder 线程池上限（默认 15+1）、`linkToDeath` 重连
27. `android.binder-transaction-too-large` · **`TransactionTooLargeException` 成因与大跨进程传参治理** `核心常考` `对比表`
    - 核心关键词：单进程映射上限 `1MB - 8KB`（`oneway` 异步事务减半）、Bundle 大数据踩坑、文件/`SharedMemory` 传递方案
28. `android.process-lmkd-zygote` · **Android 进程优先级（`oom_score_adj` / LMKD 策略）、Zygote `fork` 与保活边界** `中级加分` `对比表`
    - 核心关键词：`oom_score_adj` 评分、Foreground/Visible/Service/Cached 进程、Copy-on-Write 共享资源、合规后台替代

### 03-03 Context、Window 与系统服务（2 题）
29. `android.context-variants-token` · **`Application`、`Activity`、`Service` Context 差异与 Dialog 弹窗报错本质** `高频必考` `对比表`
    - 核心关键词：`ContextImpl` 委托、`ContextThemeWrapper` 主题能力、`Window Token` 校验、`getApplicationContext()` 避坑
30. `android.window-decorview-wms` · **`Window`、`PhoneWindow`、`DecorView`、`WMS` 与 `Surface` 关系梳理** `核心常考` `Mermaid`
    - 核心关键词：`WindowManagerImpl` → `WindowManagerGlobal`、`ViewRootImpl` 桥梁、`WMS` 统一调度层级与输入焦点

### 03-04 类加载机制与热修复原理（2 题）
31. `android.classloader-dex-delegation` · **Android `ClassLoader` 双亲委派模型与 MultiDex 加载原理** `核心常考` `Mermaid`
    - 核心关键词：`BootClassLoader` / `PathClassLoader` / `DexClassLoader`、`BaseDexClassLoader` 与 `DexPathList`、65536 方法数分包
32. `android.hotfix-dex-elements` · **热修复核心原理对比（`dexElements` 插桩 vs Native 替换 vs ART 编译陷阱）** `中级加分` `对比表`
    - 核心关键词：Tinker 类加载前置 `dexElements`、CLASS_ISPREVERIFIED 校验绕过、AndFix/Sophix Native 方法表替换局限

---

## 04 · View 渲染、事件分发与自定义 View（10 题）

### 04-01 事件分发与嵌套滑动（3 题）
33. `android.touch-dispatch-u-chain` · **触摸事件分发 U 型链路（Activity → DecorView → ViewGroup → View）** `高频必考` `旗舰交互SVG`
    - 核心关键词：`dispatchTouchEvent` / `onInterceptTouchEvent` / `onTouchEvent`、责任链消费、`mFirstTouchTarget` 缓存
34. `android.touch-cancel-conflict` · **`ACTION_CANCEL` 触发条件、`requestDisallowInterceptTouchEvent` 与滑动冲突解法** `核心常考` `Mermaid`
    - 核心关键词：父容器半路拦截下发 `CANCEL`、外部拦截法 vs 内部拦截法（`ACTION_DOWN` 不可禁止父拦截）
35. `android.nested-scrolling-mechanism` · **`NestedScrollingParent3` / `NestedScrollingChild3` 嵌套滑动协作机制** `核心常考` `Mermaid`
    - 核心关键词：`onNestedPreScroll` 父布局优先消费、剩余偏移量传递、`CoordinatorLayout + Behavior` 联动基础

### 04-02 View 绘制流程与屏幕刷新原理（3 题）
36. `android.view-measure-layout-draw` · **`ViewRootImpl` 触发 `performTraversals`（Measure/Layout/Draw）与 `MeasureSpec` 规则** `高频必考` `Mermaid`
    - 核心关键词：32 位 int 高 2 位 Mode + 低 30 位 Size、`EXACTLY`/`AT_MOST`/`UNSPECIFIED`、父容器与自身 LayoutParams 合成
37. `android.invalidate-vs-requestlayout` · **`invalidate()`、`postInvalidate()` 与 `requestLayout()` 核心差异与触发范围** `核心常考` `对比表`
    - 核心关键词：`invalidate` 只触发重绘、`postInvalidate` 切回主线程、`requestLayout` 置 `PFLAG_FORCE_LAYOUT` 向上请求重测
38. `android.vsync-choreographer-jank` · **VSync 信号、`Choreographer` 调度、双缓冲/三缓冲与丢帧（Jank）原理** `高频必考` `旗舰交互SVG`
    - 核心关键词：60Hz(16.6ms)/120Hz(8.3ms) 节奏、Input/Animation/Traversal 回调队列、RenderThread GPU 流水线与 SurfaceFlinger

### 04-03 RecyclerView 核心原理与性能调优（2 题）
39. `android.recyclerview-4level-cache` · **`RecyclerView` 四级缓存机制与 ViewHolder 复用流转** `高频必考` `Mermaid`
    - 核心关键词：`mAttachedScrap` 屏幕内复用、`mCachedViews`（默认 2 个免 rebind）、`ViewCacheExtension`、`RecycledViewPool`（默认按类型存 5 个）
40. `android.recyclerview-diffutil-prefetch` · **`RecyclerView` 局部刷新（`DiffUtil` + Payload）、预取与卡顿优化** `核心常考` `对比表`
    - 核心关键词：`AsyncListDiffer`/`ListAdapter`、Payload 局部更新防图片闪烁、`GapWorker` 帧间隙 Prefetch、`setHasFixedSize`

### 04-04 自定义 View 与动画机制（2 题）
41. `android.custom-view-surface-texture` · **自定义 View 关键避坑与 `SurfaceView`/`TextureView` 渲染选型** `核心常考` `对比表`
    - 核心关键词：`AT_MOST` 下 `wrap_content` 兜底、Padding 处理、`SurfaceView` 独立 Surface 挖洞 vs `TextureView` 支持变换与动画
42. `android.property-animator-choreographer` · **属性动画（`ValueAnimator`/`ObjectAnimator`）VSync 驱动原理与防泄漏** `核心常考` `Mermaid`
    - 核心关键词：`AnimationHandler` 注册 VSync、`TimeInterpolator` + `TypeEvaluator`、无限循环动画 `onDestroy` 必须 `cancel()`

---

## 05 · Jetpack 组件、Compose 与主流架构（13 题）

### 05-01 Lifecycle、ViewModel 与 State 驱动（3 题）
43. `android.jetpack-lifecycle-state` · **`Lifecycle` 感知原理（`ReportFragment` / `ComponentActivity` 状态机分发）** `核心常考` `Mermaid`
    - 核心关键词：观察者模式 + 状态跃迁（INITIALIZED → RESUMED）、低版本透明 `ReportFragment` 注入、`DefaultLifecycleObserver`
44. `android.jetpack-viewmodel-savedstate` · **`ViewModel` 屏幕旋转不销毁原理（`NonConfigurationInstances`）与 `SavedStateHandle`** `高频必考` `Mermaid`
    - 核心关键词：`ActivityThread` 暂存 `NonConfigurationInstances`、`ViewModelStore` 复用、`onCleared()` 时机、进程重建兜底
45. `android.livedata-vs-stateflow` · **`LiveData` 粘性事件成因、`postValue` 丢数据风险与 `StateFlow` 对比** `核心常考` `对比表`
    - 核心关键词：`mVersion` 与 `mLastVersion` 比对、`postValue` 连续覆盖风险、一次性事件（`Channel`/`SharedFlow`）选型

### 05-02 Jetpack Compose 核心原理与实践（4 题）
46. `android.compose-phases-recomposition` · **Compose 三阶段渲染（Composition → Layout → Draw）、重组作用域与稳定性优化** `高频必考` `Mermaid`
    - 核心关键词：SlotTable 位置记忆、Smart Recomposition 智能跳过、`@Stable`/`@Immutable` 稳定性推断与强跳过模式
47. `android.compose-state-side-effects` · **Compose 状态管理与副作用控制（`remember`、`derivedStateOf`、`LaunchedEffect`）** `核心常考` `对比表`
    - 核心关键词：`Snapshot` 状态快照、`rememberSaveable`、`derivedStateOf` 降频派生、`LaunchedEffect` vs `DisposableEffect`
48. `android.compose-lazy-performance` · **`LazyColumn` 列表性能调优（`key`/`contentType` 与延迟读状态）** `核心常考` `Mermaid`
    - 核心关键词：稳定 `key` 避免整体重排、`contentType` 槽位复用、Lambda 参数延迟读取 `State` 跳过 Composition 阶段
49. `android.compose-view-interop` · **Compose 与传统 View 双向互操作与渐进式迁移实践** `中级加分` `对比表`
    - 核心关键词：`ComposeView`（`ViewCompositionStrategy` 生命周期策略）、`AndroidView` 托管、MdcTheme/主题与状态同步

### 05-03 Navigation、Room 与 WorkManager（3 题）
50. `android.jetpack-navigation-backstack` · **`Navigation` 导航图、SafeArgs 与多返回栈状态保存机制** `核心常考` `Mermaid`
    - 核心关键词：`NavHost` / `NavController`、BottomNavigation 多栈隔离保存恢复、DeepLink 路由匹配与类型安全传参
51. `android.jetpack-room-wal-migration` · **`Room` 编译期校验、事务线程模型及 SQLite WAL 模式 / 平滑升级** `核心常考` `Mermaid`
    - 核心关键词：APT/KSP 生成 DAO 实现、WAL（Write-Ahead Logging）读写并发、`AutoMigration` 与升级失败兜底
52. `android.jetpack-workmanager-doze` · **`WorkManager` 后台调度封装原理与省电约束保证** `核心常考` `Mermaid`
    - 核心关键词：API 23+ `JobScheduler` 底层委托、Room 持久化任务状态、Doze 兼容性与 `Expedited` 加急任务

### 05-04 架构演进、设计模式与依赖注入（3 题）
53. `android.arch-mvc-mvp-mvvm-mvi` · **MVC / MVP / MVVM / MVI 架构对比与单向数据流（UDF）落地权衡** `高频必考` `对比表`
    - 核心关键词：P 层膨胀与泄漏、MVVM 状态分散痛点、MVI `Intent → ViewState + SideEffect` 唯一可信数据源
54. `android.android-design-patterns` · **Android 源码中的高频设计模式实战（DCL、Builder、动态代理、责任链、观察者）** `核心常考` `对比表`
    - 核心关键词：`volatile` 禁止重排 DCL 单例、AlertDialog Builder、Retrofit 动态代理、OkHttp 责任链、Lifecycle 观察者
55. `android.di-hilt-vs-koin` · **Hilt（编译期生成）vs Koin（运行时 DSL）依赖注入原理对比** `中级加分` `对比表`
    - 核心关键词：Dagger2 APT/KSP 编译期图校验零反射（Hilt 生命周期组件）vs Koin 轻量 Service Locator 与启动耗时对比

---

## 06 · 网络通信、协议与主流三方库（11 题）

### 06-01 网络协议与传输基础（3 题）
56. `android.net-tcp-handshake-teardown` · **TCP 三次握手 / 四次挥手、可靠传输与客户端连接异常（`TIME_WAIT`）** `核心常考` `Mermaid`
    - 核心关键词：SEQ/ACK 状态机、为什么握手 3 次而挥手 4 次、2MSL `TIME_WAIT` 意义、拥塞控制与半连接队列
57. `android.net-https-tls-pinning` · **HTTPS / TLS 1.2 & 1.3 握手、CA 证书链校验与防抓包劫持** `核心常考` `Mermaid`
    - 核心关键词：非对称密钥交换（ECDHE）+ 对称加密通信、TLS 1.3 1-RTT/0-RTT 优化、CA 信任链与 Certificate Pinning
58. `android.net-http-versions-httpdns` · **HTTP/1.1 vs HTTP/2 多路复用 vs HTTP/3（QUIC）及弱网 HttpDNS 优化** `核心常考` `对比表`
    - 核心关键词：队头阻塞（HTTP/1.1 管线 vs HTTP/2 TCP 层阻塞 vs QUIC UDP 独立流）、LocalDNS 劫持与 `HttpDNS` 绕过

### 06-02 OkHttp 与 Retrofit 核心机制（3 题）
59. `android.okhttp-interceptor-chain` · **`OkHttp` 责任链拦截器机制（五大内置拦截器顺序与自研拦截器挂载点）** `高频必考` `旗舰交互SVG`
    - 核心关键词：`RetryAndFollowUp` → `Bridge` → `Cache` → `Connect` → `CallServer`、`addInterceptor` vs `addNetworkInterceptor`
60. `android.okhttp-connection-pool` · **`OkHttp` 连接池复用（`RealConnectionPool`）与 `Dispatcher` 调度** `核心常考` `Mermaid`
    - 核心关键词：最大空闲 5 连接 / 5 分钟清理线程、并发 64 / 同主机 5 请求队列、HTTP/2 多路复用共享连接
61. `android.retrofit-proxy-suspend` · **`Retrofit` 动态代理 + `CallAdapter`/`Converter` 与协程 `suspend` 集成原理** `核心常考` `Mermaid`
    - 核心关键词：`Proxy.newProxyInstance` 解析注解构建 `ServiceMethod`、`SuspendForBody` 自动适配 `enqueue` 与挂起恢复

### 06-03 图片加载库（Glide / Coil）与 Bitmap 内存（3 题）
62. `android.glide-lifecycle-binding` · **`Glide` 生命周期绑定机制与请求自动暂停/取消时机** `核心常考` `Mermaid`
    - 核心关键词：`RequestManagerRetriever` 注入透明 Fragment（新版整合 `Lifecycle`）、Application 与页面作用域内存安全差异
63. `android.glide-3level-cache` · **`Glide` 4 三级缓存（ActiveResources → LruCache → DiskLruCache）读写链路** `高频必考` `Mermaid`
    - 核心关键词：弱引用活动缓存防正在显示的图被 LRU 踢出、`LruResourceCache`、Glide 4 磁盘策略（`DATA` 原始数据 vs `RESOURCE` 解码转换图）
64. `android.bitmap-memory-oom-coil` · **Bitmap 内存计算公式、采样复用（`inSampleSize`/`inBitmap`）与 `Coil` 优势** `核心常考` `对比表`
    - 核心关键词：内存公式 `宽 × 高 × 单像素字节 × (targetDensity / inDensity)²`、`inJustDecodeBounds`、`Hardware Bitmap`、`Coil` 协程原生

### 06-04 本地存储与序列化方案选型（2 题）
65. `android.storage-sp-mmkv-datastore` · **`SharedPreferences` 缺陷（全量 XML / UI `fsync` ANR）与 `MMKV`/`DataStore` 对比** `高频必考` `对比表`
    - 核心关键词：`QueuedWork.waitToFinish()` 阻塞 `onStop`、`MMKV` 基于 `mmap` + Protobuf 增量写、`DataStore` 协程异步原子化
66. `android.serialization-parcelable-json` · **序列化选型对比（`Serializable` vs `Parcelable`、`Gson` vs `Moshi`/`kotlinx.serialization`）** `核心常考` `对比表`
    - 核心关键词：反射 I/O vs 内存直写、Gson 反射破坏 Kotlin 非空默认值陷阱、编译期无反射序列化对比

---

## 07 · 性能优化与稳定性治理（8 题）

### 07-01 内存优化与 OOM / 泄漏治理（3 题）
67. `android.leakcanary-principle` · **`LeakCanary` 自动检测内存泄漏原理（`WeakReference` + `ReferenceQueue` + Shark）** `高频必考` `Mermaid`
    - 核心关键词：`AppWatcher` 监听组件销毁、延迟 5s 触发 GC 校验对象存活、Shark 分析 Hprof 最短 GC Root 引用链
68. `android.memory-leak-checklist` · **高频内存泄漏场景排查清单与治理模板** `核心常考` `对比表`
    - 核心关键词：非静态内部类/匿名回调、单例误持 Activity Context、动画/监听/协程作用域未释放、WebView 独立进程销毁
69. `android.oom-native-fd-threads` · **Java Heap / Native 内存 / FD 与线程数溢出及 KOOM 排查思路** `核心常考` `Mermaid`
    - 核心关键词：OOM 多维成因（Java 堆满、`pthread_create` 失败、虚拟内存耗尽、FD 上限如 1024~32768 耗尽）、`dumpsys meminfo` / KOOM 裁剪 Fork Dump

### 07-02 启动速度、编译与卡顿功耗优化（3 题）
70. `android.cold-start-optimization` · **App 冷启动拆解（TTID/TTFD）、异步 DAG 编排与 ART JIT/AOT + Baseline Profiles** `高频必考` `Mermaid`
    - 核心关键词：启动任务有向无环图（DAG）并行调度、`IdleHandler` 懒加载、`SplashScreen` 主题占位、Baseline Profiles 云端/本地 AOT 预编译热点代码
71. `android.ui-jank-monitoring` · **界面卡顿（UI Jank）线上监控与 Perfetto 定位工具链** `核心常考` `Mermaid`
    - 核心关键词：`Looper.setMessageLogging` 耗时抓取、`Choreographer.FrameCallback` 掉帧计算、Perfetto 分析主线程锁等待与 Binder 阻塞
72. `android.network-battery-optimization` · **网络流量、后台定位与 WakeLock 电量消耗优化要点** `中级加分` `对比表`
    - 核心关键词：接口合并与 Protobuf 压缩、弱网重试退避、传感器/定位解绑与 WakeLock 超时释放管控

### 07-03 崩溃、ANR 与线上稳定性闭环（2 题）
73. `android.anr-traces-exitinfo` · **ANR 触发阈值、`traces.txt` 核心字段解读与 `ApplicationExitInfo` 离线回溯** `高频必考` `Mermaid`
    - 核心关键词：Input 5s / 前台广播 10s / 前台服务 20s、`main` 线程状态（`Blocked`/`Native`/`Waiting`）、Android 11+ `ApplicationExitInfo` 精准获取 ANR/LMK 现场
74. `android.java-native-crash-loop` · **Java Crash、Native Crash（`sigaction`/Tombstone）捕获与灰度熔断闭环** `中级加分` `Mermaid`
    - 核心关键词：`UncaughtExceptionHandler` 责任链透传、`sigaction` 注册 `SIGSEGV/SIGABRT` + 备用栈、`addr2line` 符号化、灰度告警熔断与降级开关

---

## 08 · 工程化、构建、安全与适配（8 题）

### 08-01 Gradle 构建与包体积优化（3 题）
75. `android.apk-build-signing` · **APK 打包构建全流程（AAPT2、D8/R8 与 V1–V4 签名差异）** `高频必考` `Mermaid`
    - 核心关键词：`resources.arsc` 与 `R.java`、D8 脱糖、R8 混淆压缩、V1 JAR 签名 vs V2/V3 全文件块签名、V4 流式增量安装
76. `android.gradle-build-speed` · **Gradle 构建提速实践（Configuration Cache、Build Cache 与 KSP 替代 KAPT）** `核心常考` `对比表`
    - 核心关键词：Initialization/Configuration/Execution 阶段、配置缓存与任务输出缓存、KSP 免 Java 存根编译提速
77. `android.apk-size-shrinking` · **APK/AAB 包体积瘦身体系化方案** `核心常考` `对比表`
    - 核心关键词：`minifyEnabled` + R8 优化资源裁剪（`android.enableR8.optimizedResourceShrinking`）、WebP/AVIF 压缩、`.so` ABI 裁剪与动态下发

### 08-02 组件化、模块化与混合容器（2 题）
78. `android.modular-routing-asm` · **多模块组件化通信与路由实现（SPI、APT/KSP 与 AGP 8 `AsmClassVisitorFactory`）** `核心常考` `Mermaid`
    - 核心关键词：模块分层解耦（App/Biz/Base）、SPI 接口下沉、编译期生成路由表 vs AGP 8 `AsmClassVisitorFactory` 字节码插桩注册（取代已移除的 Transform API）
79. `android.webview-hybrid-security` · **WebView / Hybrid 容器深度优化（秒开、离线包与 JSBridge 安全）** `核心常考` `Mermaid`
    - 核心关键词：独立进程隔离内存、预创建池、`shouldInterceptRequest` 离线资源拦截、`@JavascriptInterface` 域名白名单与白屏检测

### 08-03 安全合规、屏幕与系统版本适配（3 题）
80. `android.client-security-keystore` · **客户端通信安全、本地敏感存储与防逆向基础防线** `核心常考` `对比表`
    - 核心关键词：HTTPS + SSL Pinning 防抓包、`AndroidKeyStore` 硬件密钥存储、签名校验与防调试基础
81. `android.screen-adaptation-foldable` · **屏幕适配原理（`dp/sp/density`、`SmallestWidth`）与折叠屏/大屏适配** `核心常考` `对比表`
    - 核心关键词：px 与 dp 换算、`smallestWidth` 限定符、屏幕等比例缩放方案、Jetpack `WindowManager` 折叠态与自适应双栏布局
82. `android.version-adaptation-10-16` · **Android 10–16 核心版本适配清单（存储、权限、预测性返回、Edge-to-Edge 与 16KB 页大小）** `核心常考` `对比表`
    - 核心关键词：Scoped Storage 分区存储、13 通知权限、14 前台服务类型、15 16KB Page Size 对齐、16 强制 Edge-to-Edge、预测性返回与大屏忽略锁定方向/不可缩放限制

---

## 09 · 算法与客户端高频场景题（7 题）

### 09-01 面试手写高频数据结构、算法模式与并发（4 题）
83. `android.algo-lru-cache` · **手写 `LRU Cache` 核心思路与 Android `LruCache` 源码差异** `高频必考` `Mermaid`
    - 核心关键词：`HashMap` + 双向链表 O(1) 淘汰、`LinkedHashMap(accessOrder = true)`、Android `LruCache` 字节数控制（`sizeOf`）与线程安全
84. `android.algo-multithread-sync` · **多线程交替打印与经典生产者-消费者模型** `核心常考` `Mermaid`
    - 核心关键词：`wait/notifyAll` 防虚假唤醒（`while`）、`ReentrantLock` 多 `Condition` 精准唤醒、Kotlin `Channel` 挂起实现
85. `android.algo-view-tree-linkedlist` · **客户端高频树/链表问题（View 树层序遍历、最近公共父容器、链表反转与环检测）** `核心常考` `Mermaid`
    - 核心关键词：BFS 层序求 View 树深度/最大宽度、DFS 寻找两子 View 最近公共父 ViewGroup、快慢双指针
86. `android.algo-hot100-patterns` · **客户端手撕算法高频模式速记（Hot100 核心子集）** `中级加分` `对比表`
    - 核心关键词：双指针/滑动窗口、哈希表与前缀和、单调栈、二叉树 DFS/BFS 模板、一维/二维经典 DP 状态转移框架

### 09-02 客户端综合系统设计场景题（3 题）
87. `android.scenario-multi-downloader` · **场景设计：高可靠的多任务断点续传下载器架构** `核心常考` `Mermaid`
    - 核心关键词：HTTP `Range` 与 `206 Partial Content`、`RandomAccessFile` 分块写入、数据库分片进度持久化、并发限流与文件校验
88. `android.scenario-feed-performance` · **场景设计：千万级 Feed 列表防卡顿、防闪烁与精准曝光埋点去重** `核心常考` `Mermaid`
    - 核心关键词：多 ViewType Pool 复用、图片预加载与滑动暂停、异步布局预加载、基于可视比例（>=50%）与停留时长（>=1s）曝光去重
89. `android.scenario-im-weak-network` · **场景设计：IM 长连接通道架构与弱网消息“不丢、不重、有序”保障** `中级加分` `Mermaid`
    - 核心关键词：TCP/WebSocket 心跳自适应退避、`clientMsgId` 本地去重 + 服务端全局 `seqId` 补洞拉取、ACK 超时重传状态机

---

## 候选扩展池（按需勾选增补）

以下专题在常规中级 Android 面试中属于“加分项”或“特定业务方向（音视频/硬件/跨端/大厂项目深挖）”。如需纳入一期题库，请在回复中点名或勾选对应编号：

- [ ] **扩展 1 · 项目深挖与 STAR 行为面试专题**（推荐！包含：如何梳理项目技术难点与架构演进、线上疑难问题复盘模板、跨团队协作与技术方案选型答辩）
- [ ] **扩展 2 · NDK / JNI 与 C++ 跨层调用基础**（JNI 静态/动态注册、局部/全局引用防表溢出、`CMakeLists` 与 `.so` 排查）
- [ ] **扩展 3 · 音视频开发基础**（`MediaCodec` 硬编解码、`ExoPlayer` 缓冲架构、音频焦点与首帧秒开）
- [ ] **扩展 4 · 蓝牙 BLE / 物联网连接基础**（GATT 协议、Scan/Connect 状态机与 Android 12+ 蓝牙权限适配）
- [ ] **扩展 5 · 跨端框架选型对比（Flutter / Kotlin Multiplatform）**（Flutter 三棵树与 PlatformChannel vs KMP 共享业务逻辑现状）
- [ ] **扩展 6 · 插件化深入架构**（Hook AMS 启动未注册 Activity、AssetManager 资源合并隔离与高版本受限现状）
