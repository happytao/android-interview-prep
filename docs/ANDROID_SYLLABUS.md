# Android 中级开发工程师面试知识大纲（Phase 1 · 最终确认版）

> **大纲说明**  
> 1. 本大纲已结合你补充的 **NDK/JNI、音视频与 MediaStore 媒体库、图像处理/高斯模糊、BLE 蓝牙、Compose 深化、JSBridge、滑动冲突与 NestedScrollView/CoordinatorLayout、WindowInsets/Edge-to-Edge、WebView、Okio/TLS 鉴权/Socket/WebSocket、SQLite 事务/Room 迁移、Hilt、mmap、AAPT2/Manifest/Flavor/MultiDex/混淆/ADB、Perfetto** 等全部要求完成修订，对标 **2–5 年经验 Android 中级工程师**实战与面试全栈覆盖。  
> 2. 题号采用**不可变语义 ID**（如 `android.handler-epoll`），后续增删或调整顺序不破坏个人笔记与进度；**`高频必考` 精选 28/111 题（25.2%）**，其余为 `核心常考` 与 `中级加分`。  
> 3. **现状与实施策略**：已跳过再次 Opus 评审，直接以此最终版进入 Phase 2 开发与题库精编。

---

## 知识全景总览

| 序号 | 一级分类（L1） | 二级专题（L2） | 题目数 | 高频必考 | 图解分配（5 旗舰交互 SVG + Mermaid + 对比表） | 核心考察聚焦 |
| :---: | :--- | :---: | :---: | :---: | :--- | :--- |
| 01 | Kotlin 与 Java 核心基础 | 3 | 12 | 4 | 7 Mermaid · 5 对比表 | 协程状态机、结构化并发、泛型/APT/KSP、ART 锁与 GC |
| 02 | Android 四大组件与生命周期 | 3 | 8 | 3 | 7 Mermaid · 1 对比表 | 生命周期交错、任务栈、冷启动全链路与后台服务合规 |
| 03 | Android Framework 核心机制 | 4 | 12 | 4 | **2 交互 SVG** · 5 Mermaid · 5 对比表 | Handler/epoll、Binder mmap、ClassLoader 与热修复 |
| 04 | View 渲染、事件分发、滑动与动画 | 4 | 12 | 5 | **2 交互 SVG** · 6 Mermaid · 4 对比表 | U 型事件分发、横竖冲突/NSV/CoordinatorLayout、VSync、RecyclerView、动画体系 |
| 05 | Jetpack 组件、Compose 与主流架构 | 4 | 14 | 3 | 8 Mermaid · 6 对比表 | Lifecycle/ViewModel、Compose 深入、Room 迁移与 SQLite 事务、UDF 与 Hilt |
| 06 | 网络通信、协议、三方库与本地存储 | 4 | 14 | 4 | **1 交互 SVG** · 9 Mermaid · 4 对比表 | TCP/mTLS/HTTP3/Socket/WebSocket、OkHttp/Okio/Retrofit、Glide 4、DataStore/mmap |
| 07 | 性能优化与稳定性治理 | 3 | 9 | 3 | 7 Mermaid · 2 对比表 | LeakCanary/内存/KOOM、冷启动/Baseline Profiles、Perfetto 实战、ANR/Crash |
| 08 | 工程化、编译构建、WebView、安全与适配 | 3 | 14 | 1 | 6 Mermaid · 8 对比表 | AAPT2/Manifest/Resources/Flavor/MultiDex/R8/ADB、WebView/JSBridge、WindowInsets/权限/版本适配 |
| 09 | 算法、数据结构与客户端高频场景题 | 2 | 7 | 1 | 6 Mermaid · 1 对比表 | 常用数据结构与 Hot100 模式、LRU/多线程/View 树、下载器/Feed/IM 场景 |
| 10 | NDK、多媒体、图像处理与 BLE 蓝牙 | 4 | 9 | 0 | 5 Mermaid · 4 对比表 | JNI/CMake、MediaCodec/ExoPlayer/MediaStore 媒体加载、高斯模糊与图形 API、BLE GATT |
| **合计** | **10 个一级分类** | **34 个二级专题** | **111 题** | **28 题 (25.2%)** | **5 旗舰交互 SVG + 66 Mermaid + 40 对比表** | **覆盖 Android 中级全链路知识图谱** |

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

## 04 · View 渲染、事件分发、滑动与动画（12 题）

### 04-01 事件分发、滑动冲突与嵌套联动（4 题）
33. `android.touch-dispatch-u-chain` · **触摸事件分发 U 型链路（Activity → DecorView → ViewGroup → View）** `高频必考` `旗舰交互SVG`
    - 核心关键词：`dispatchTouchEvent` / `onInterceptTouchEvent` / `onTouchEvent`、责任链消费、`mFirstTouchTarget` 缓存
34. `android.touch-cancel-scroll-conflict` · **`ACTION_CANCEL` 触发与滑动冲突实战（横向/竖向冲突案例及内外部拦截法）** `高频必考` `Mermaid`
    - 核心关键词：父容器半路拦截下发 `CANCEL`、外部拦截法 vs 内部拦截法、`ViewPager2 + RecyclerView`/横向 Banner 冲突处理（`ACTION_DOWN` 不可禁止拦截）
35. `android.nested-scrolling-nestedscrollview` · **`NestedScrollingParent3` 机制与 `NestedScrollView` 嵌套踩坑要点** `核心常考` `Mermaid`
    - 核心关键词：`onNestedPreScroll`/`onNestedScroll`、Fling 传递、`NestedScrollView` 嵌套 `RecyclerView` 导致复用失效与全量测量 OOM、`isNestedScrollingEnabled`/`fillViewport`
36. `android.coordinator-appbar-behavior` · **`CoordinatorLayout` + `AppBarLayout` 联动原理与自定义 `Behavior` 实践** `核心常考` `Mermaid`
    - 核心关键词：`layout_scrollFlags`（`scroll|enterAlways|exitUntilCollapsed`）、`CollapsingToolbarLayout` 视差吸顶、自定义 `Behavior`（依赖视图 & 嵌套滚动）与 Fling 抖动处理

### 04-02 View 绘制流程与屏幕刷新原理（3 题）
37. `android.view-measure-layout-draw` · **`ViewRootImpl` 触发 `performTraversals`（Measure/Layout/Draw）与 `MeasureSpec` 规则** `高频必考` `Mermaid`
    - 核心关键词：32 位 int 高 2 位 Mode + 低 30 位 Size、`EXACTLY`/`AT_MOST`/`UNSPECIFIED`、父容器与自身 LayoutParams 合成
38. `android.invalidate-vs-requestlayout` · **`invalidate()`、`postInvalidate()` 与 `requestLayout()` 核心差异与触发范围** `核心常考` `对比表`
    - 核心关键词：`invalidate` 只触发重绘、`postInvalidate` 切回主线程、`requestLayout` 置 `PFLAG_FORCE_LAYOUT` 向上请求重测
39. `android.vsync-choreographer-jank` · **VSync 信号、`Choreographer` 调度、双缓冲/三缓冲与丢帧（Jank）原理** `高频必考` `旗舰交互SVG`
    - 核心关键词：60Hz(16.6ms)/120Hz(8.3ms) 节奏、Input/Animation/Traversal 回调队列、RenderThread GPU 流水线与 SurfaceFlinger

### 04-03 RecyclerView 核心原理与性能调优（2 题）
40. `android.recyclerview-4level-cache` · **`RecyclerView` 四级缓存结构与 `getViewForPosition` 复用流转** `高频必考` `Mermaid`
    - 核心关键词：`mAttachedScrap`/`mChangedScrap` 屏幕内复用、`mCachedViews`（默认 2 个免 rebind）、`ViewCacheExtension`、`RecycledViewPool`（默认按类型存 5 个）
41. `android.recyclerview-diffutil-prefetch` · **`RecyclerView` 局部刷新（`DiffUtil` + Payload）、预取与卡顿优化** `核心常考` `对比表`
    - 核心关键词：`AsyncListDiffer`/`ListAdapter`、Payload 局部更新防图片闪烁、`GapWorker` 帧间隙 Prefetch、`setHasFixedSize`

### 04-04 自定义 View 与动画体系（3 题）
42. `android.custom-view-surface-texture` · **自定义 View 关键避坑与 `SurfaceView`/`TextureView` 渲染选型** `核心常考` `对比表`
    - 核心关键词：`AT_MOST` 下 `wrap_content` 兜底、Padding 处理、`SurfaceView` 独立 Surface 挖洞 vs `TextureView` 支持变换与动画
43. `android.animation-system-comparison` · **Android 动画全景对比（帧动画、补间动画、属性动画、Transition/MotionLayout、Lottie）** `核心常考` `对比表`
    - 核心关键词：View Animation 仅改绘制矩阵不改点击区域、属性动画真修改属性、帧动画 OOM 风险、`MotionLayout` 驱动交互动画与 Lottie 硬件加速优化
44. `android.property-animator-choreographer` · **属性动画（`ValueAnimator`/`ObjectAnimator`）VSync 驱动原理与防泄漏** `核心常考` `Mermaid`
    - 核心关键词：`AnimationHandler` 注册 VSync、`TimeInterpolator` + `TypeEvaluator`、无限循环动画 `onDestroy` 必须 `cancel()`

---

## 05 · Jetpack 组件、Compose 与主流架构（14 题）

### 05-01 Lifecycle、ViewModel 与 State 驱动（3 题）
45. `android.jetpack-lifecycle-state` · **`Lifecycle` 感知原理（`ReportFragment` / `ComponentActivity` 状态机分发）** `核心常考` `Mermaid`
    - 核心关键词：观察者模式 + 状态跃迁（INITIALIZED → RESUMED）、低版本透明 `ReportFragment` 注入、`DefaultLifecycleObserver`
46. `android.jetpack-viewmodel-savedstate` · **`ViewModel` 屏幕旋转不销毁原理（`NonConfigurationInstances`）与 `SavedStateHandle`** `高频必考` `Mermaid`
    - 核心关键词：`ActivityThread` 暂存 `NonConfigurationInstances`、`ViewModelStore` 复用、`onCleared()` 时机、进程重建兜底
47. `android.livedata-vs-stateflow` · **`LiveData` 粘性事件成因、`postValue` 丢数据风险与 `StateFlow` 对比** `核心常考` `对比表`
    - 核心关键词：`mVersion` 与 `mLastVersion` 比对、`postValue` 连续覆盖风险、一次性事件（`Channel`/`SharedFlow`）选型

### 05-02 Jetpack Compose 核心原理与实践（4 题）
48. `android.compose-phases-recomposition` · **Compose 三阶段渲染（Composition → Layout → Draw）、重组作用域与稳定性优化** `高频必考` `Mermaid`
    - 核心关键词：SlotTable 位置记忆、Smart Recomposition 智能跳过、`@Stable`/`@Immutable` 稳定性推断与强跳过模式
49. `android.compose-state-side-effects` · **Compose 状态管理与副作用控制（`remember`、`derivedStateOf`、`LaunchedEffect`）** `核心常考` `对比表`
    - 核心关键词：`Snapshot` 状态快照、`rememberSaveable`、`derivedStateOf` 降频派生、`LaunchedEffect` vs `DisposableEffect`
50. `android.compose-lazy-performance` · **`LazyColumn` 列表性能调优（`key`/`contentType` 与延迟读状态）** `核心常考` `Mermaid`
    - 核心关键词：稳定 `key` 避免整体重排、`contentType` 槽位复用、Lambda 参数延迟读取 `State` 跳过 Composition 阶段
51. `android.compose-view-interop` · **Compose 与传统 View 双向互操作与渐进式迁移实践** `中级加分` `对比表`
    - 核心关键词：`ComposeView`（`ViewCompositionStrategy` 生命周期策略）、`AndroidView` 托管、主题与状态同步

### 05-03 Room、SQLite、Navigation 与 WorkManager（4 题）
52. `android.jetpack-room-migration` · **`Room` 编译期校验、DAO 封装与数据库升级迁移策略** `核心常考` `Mermaid`
    - 核心关键词：APT/KSP 生成 DAO、`@Entity`/`@Relation`、手写 `Migration` vs `AutoMigration`、结构校验失败与降级兜底策略
53. `android.sqlite-transaction-wal` · **SQLite 事务机制（ACID、锁模式、Journal vs WAL）与索引查询优化** `核心常考` `Mermaid`
    - 核心关键词：`DEFERRED`/`IMMEDIATE`/`EXCLUSIVE` 事务锁、Rollback Journal vs WAL（Write-Ahead Logging）读写并发、批量写入包事务与索引 B+ 树失效场景
54. `android.jetpack-navigation-backstack` · **`Navigation` 导航图、SafeArgs 与多返回栈状态保存机制** `核心常考` `Mermaid`
    - 核心关键词：`NavHost` / `NavController`、BottomNavigation 多栈隔离保存恢复、DeepLink 路由匹配与类型安全传参
55. `android.jetpack-workmanager-doze` · **`WorkManager` 后台调度封装原理与省电约束保证** `核心常考` `Mermaid`
    - 核心关键词：API 23+ `JobScheduler` 底层委托、Room 持久化任务状态、Doze 兼容性与 `Expedited` 加急任务

### 05-04 架构演进、设计模式与依赖注入（3 题）
56. `android.arch-mvc-mvp-mvvm-mvi` · **MVC / MVP / MVVM / MVI 架构演进与单向数据流（UDF）最佳实践** `高频必考` `对比表`
    - 核心关键词：MVC/MVP/MVVM 演进痛点、MVI 唯一可信数据源（Single Source of Truth）、不可变 `UiState` + Reducer、`UiEvent`/`SideEffect` 防重防丢最佳实践
57. `android.android-design-patterns` · **Android 源码中的高频设计模式实战（单例、Builder、工厂、代理、责任链、观察者、享元）** `核心常考` `对比表`
    - 核心关键词：`volatile` DCL 单例、AlertDialog Builder、Retrofit 动态代理、OkHttp 责任链、Lifecycle 观察者、`Message.obtain()` 享元、ContextWrapper 装饰器
58. `android.di-hilt-principle` · **`Hilt` 依赖注入核心原理、作用域层级与 Koin 对比** `核心常考` `对比表`
    - 核心关键词：基于 Dagger2 编译期生成零反射、组件树作用域（`SingletonComponent` / `ActivityRetainedComponent` / `ViewModelComponent`）、`@Binds` vs `@Provides`、`@EntryPoint` 跨边界注入与 Koin 对比

---

## 06 · 网络通信、协议、三方库与本地存储（14 题）

### 06-01 网络协议、TLS 鉴权与长连接（4 题）
59. `android.net-tcp-handshake-teardown` · **TCP 三次握手 / 四次挥手、可靠传输与客户端连接异常（`TIME_WAIT`）** `核心常考` `Mermaid`
    - 核心关键词：SEQ/ACK 状态机、为什么握手 3 次而挥手 4 次、2MSL `TIME_WAIT` 意义、拥塞控制与半连接队列
60. `android.net-https-tls-pinning` · **HTTPS / TLS 1.2 & 1.3 握手、CA 证书链与单双向 TLS 证书鉴权** `高频必考` `Mermaid`
    - 核心关键词：ECDHE 密钥交换 + 对称加密、TLS 1.3 1-RTT/0-RTT、CA 证书链验证、`TrustManager`/`HostnameVerifier`、双向 mTLS 与 SSL Pinning 防抓包
61. `android.net-http-versions-httpdns` · **HTTP/1.1 vs HTTP/2 多路复用 vs HTTP/3（QUIC）及弱网 HttpDNS 优化** `核心常考` `对比表`
    - 核心关键词：队头阻塞（HTTP/1.1 管线 vs HTTP/2 TCP 层阻塞 vs QUIC UDP 独立流）、LocalDNS 劫持与 `HttpDNS` 绕过
62. `android.net-socket-websocket` · **Socket（BIO/NIO/粘包拆包）与 WebSocket 长连接协议及心跳保活** `核心常考` `Mermaid`
    - 核心关键词：TCP 字节流粘包/拆包解法（长度头/分隔符）、WebSocket HTTP `101 Switching Protocols` 升级、Ping/Pong 心跳与 OkHttp `RealWebSocket`

### 06-02 OkHttp、Okio 与 Retrofit 核心机制（4 题）
63. `android.okhttp-interceptor-chain` · **`OkHttp` 责任链拦截器机制（五大内置拦截器顺序与自研拦截器挂载点）** `高频必考` `旗舰交互SVG`
    - 核心关键词：`RetryAndFollowUp` → `Bridge` → `Cache` → `Connect` → `CallServer`、`addInterceptor` vs `addNetworkInterceptor`
64. `android.okhttp-connection-pool` · **`OkHttp` 连接池复用（`RealConnectionPool`）与 `Dispatcher` 调度** `核心常考` `Mermaid`
    - 核心关键词：最大空闲 5 连接 / 5 分钟清理线程、并发 64 / 同主机 5 请求队列、HTTP/2 多路复用共享连接
65. `android.okio-segment-buffer` · **`Okio` 高性能 I/O 原理（`Buffer`、`Segment` 零拷贝分片与 `AsyncTimeout`）** `核心常考` `Mermaid`
    - 核心关键词：`Segment`（固定 8KB 双向循环链表）转移所有权免字节拷贝、`SegmentPool` 复用防 GC 抖动、`Sink`/`Source` 与 `AsyncTimeout` 守护线程超时中断
66. `android.retrofit-proxy-suspend` · **`Retrofit` 动态代理 + `CallAdapter`/`Converter` 与协程 `suspend` 集成原理** `核心常考` `Mermaid`
    - 核心关键词：`Proxy.newProxyInstance` 解析注解构建 `ServiceMethod`、`SuspendForBody` 自动适配 `enqueue` 与挂起恢复

### 06-03 图片加载库（Glide / Coil）与 Bitmap 内存（3 题）
67. `android.glide-lifecycle-binding` · **`Glide` 生命周期绑定机制与请求自动暂停/取消时机** `核心常考` `Mermaid`
    - 核心关键词：`RequestManagerRetriever` 注入透明 Fragment（新版整合 `Lifecycle`）、Application 与页面作用域内存安全差异
68. `android.glide-3level-cache` · **`Glide` 4 三级缓存结构（ActiveResources → MemoryCache → DiskLruCache）读写全链路** `高频必考` `Mermaid`
    - 核心关键词：弱引用活动缓存防正在显示的图被 LRU 踢出、`LruResourceCache`、Glide 4 磁盘策略（`DATA` 原始数据 vs `RESOURCE` 解码转换图）
69. `android.bitmap-memory-oom-coil` · **Bitmap 内存计算公式、采样复用（`inSampleSize`/`inBitmap`）与 `Coil` 优势** `核心常考` `对比表`
    - 核心关键词：内存公式 `宽 × 高 × 单像素字节 × (targetDensity / inDensity)²`、`inJustDecodeBounds`、`Hardware Bitmap`、`Coil` 协程原生

### 06-04 本地存储、`mmap` 与序列化（3 题）
70. `android.storage-sp-mmkv-datastore` · **`SharedPreferences` 缺陷（全量 XML / UI `fsync` ANR）与 `DataStore`/`MMKV` 对比** `高频必考` `对比表`
    - 核心关键词：`QueuedWork.waitToFinish()` 阻塞 `onStop`、`DataStore`（Preferences/Proto）Flow 异步原子化、`MMKV` 增量追加写与多进程对比
71. `android.mmap-principle-android` · **`mmap` 内存映射原理与在 Android 中的核心应用（Binder / MMKV / Xlog）** `核心常考` `Mermaid`
    - 核心关键词：虚拟内存页表映射到同一内核 Page Cache、缺页中断按需加载、免一次用户/内核拷贝、数据落盘回写安全性对比
72. `android.serialization-parcelable-json` · **序列化选型对比（`Serializable` vs `Parcelable`、`Gson` vs `Moshi`/`kotlinx.serialization`）** `核心常考` `对比表`
    - 核心关键词：反射 I/O vs 内存直写、Gson 反射破坏 Kotlin 非空默认值陷阱、编译期无反射序列化对比

---

## 07 · 性能优化与稳定性治理（9 题）

### 07-01 内存优化与 OOM / 泄漏治理（3 题）
73. `android.leakcanary-principle` · **`LeakCanary` 自动检测内存泄漏原理（`WeakReference` + `ReferenceQueue` + Shark）** `高频必考` `Mermaid`
    - 核心关键词：`AppWatcher` 监听组件销毁、延迟 5s 触发 GC 校验对象存活、Shark 分析 Hprof 最短 GC Root 引用链
74. `android.memory-leak-checklist` · **高频内存泄漏场景排查清单与内存优化实战** `核心常考` `对比表`
    - 核心关键词：非静态内部类/匿名回调、单例误持 Activity Context、动画/监听/协程作用域未释放、Bitmap/对象池内存抖动治理
75. `android.oom-native-fd-threads` · **Java Heap / Native 内存 / FD 与线程数溢出及 KOOM 排查思路** `核心常考` `Mermaid`
    - 核心关键词：OOM 多维成因（Java 堆满、`pthread_create` 失败、虚拟内存耗尽、FD 上限如 1024~32768 耗尽）、`dumpsys meminfo` / KOOM 裁剪 Fork Dump

### 07-02 启动速度、卡顿优化与 Perfetto 实战（4 题）
76. `android.cold-start-optimization` · **App 冷启动优化实战（TTID/TTFD 拆解、DAG 编排与 Baseline Profiles）** `高频必考` `Mermaid`
    - 核心关键词：启动任务有向无环图（DAG）并行调度、`IdleHandler` 懒加载、`SplashScreen` 占位、Baseline Profiles AOT 预编译热点代码
77. `android.ui-jank-monitoring` · **界面卡顿（UI Jank）线上监控与常规渲染优化手段** `核心常考` `Mermaid`
    - 核心关键词：`Looper.setMessageLogging` 耗时抓取、`Choreographer.FrameCallback` 掉帧计算、布局扁平化（`ConstraintLayout`/`ViewStub`/`AsyncLayoutInflater`）与主线程 IO 治理
78. `android.perfetto-trace-practice` · **`Perfetto` 性能分析实战（Trace 抓取、核心泳道与卡顿/调度归因）** `核心常考` `Mermaid`
    - 核心关键词：`Frames`/`MainThread`/`RenderThread`/`Binder` 泳道识别掉帧、CPU 调度状态（`Running`/`Runnable`/`Sleeping`/`Uninterruptible Sleep IO`）与 `Trace.beginSection` 自定义打点
79. `android.network-battery-optimization` · **网络流量、后台定位与 WakeLock 电量消耗优化要点** `中级加分` `对比表`
    - 核心关键词：接口合并与 Protobuf 压缩、弱网重试退避、传感器/定位解绑与 WakeLock 超时释放管控

### 07-03 崩溃、ANR 与线上稳定性闭环（2 题）
80. `android.anr-traces-exitinfo` · **ANR 触发阈值、`traces.txt` 核心字段解读与 `ApplicationExitInfo` 离线回溯** `高频必考` `Mermaid`
    - 核心关键词：Input 5s / 前台广播 10s / 前台服务 20s、`main` 线程状态（`Blocked`/`Native`/`Waiting`）、Android 11+ `ApplicationExitInfo` 精准获取 ANR/LMK 现场
81. `android.java-native-crash-loop` · **Java Crash、Native Crash（`sigaction`/Tombstone）捕获与灰度熔断闭环** `中级加分` `Mermaid`
    - 核心关键词：`UncaughtExceptionHandler` 责任链透传、`sigaction` 注册 `SIGSEGV/SIGABRT` + 备用栈、`addr2line` 符号化、灰度告警熔断与降级开关

---

## 08 · 工程化、编译构建、WebView、安全与适配（14 题）

### 08-01 编译构建、AAPT2、Gradle、混淆与 ADB（6 题）
82. `android.apk-aapt2-signing` · **APK 打包全流程、`AAPT2` 编译链接原理与 V1–V4 签名差异** `高频必考` `Mermaid`
    - 核心关键词：`AAPT2 compile` 生成 `.flat` 增量编译 + `link` 生成 `resources.arsc`/`R.jar`、D8/R8 编译、V1 JAR vs V2/V3 全文件块签名与 V4 流式安装
83. `android.manifest-resources-merger` · **多模块 `AndroidManifest.xml` 合并与 `Resources` 资源合并冲突解决** `核心常考` `Mermaid`
    - 核心关键词：Manifest Merger 优先级（buildType/flavor → main → library）、`tools:replace`/`tools:node="remove"` 解决节点与属性冲突、Resources 覆盖规则与 `resourcePrefix` 防重名
84. `android.gradle-script-flavors-speed` · **Gradle 脚本机制、`productFlavors` 多渠道变体与构建提速** `核心常考` `对比表`
    - 核心关键词：Groovy vs Kotlin DSL（`.gradle.kts`）、生命周期 3 阶段、`buildTypes × productFlavors`（`flavorDimensions`）变体、`Configuration Cache`/`Build Cache` 与 KSP 提速
85. `android.multidex-r8-proguard` · **`MultiDex` 分包加载机制与 `R8/ProGuard` 代码混淆实战** `核心常考` `对比表`
    - 核心关键词：65536 方法数上限、`MainDexList` 与 ART 原生多 Dex 支持（API 21+）；R8 压缩/优化/混淆/去重、`@Keep` 与反射/序列化/JNI `keep` 规则、`mapping.txt` 还原
86. `android.apk-size-shrinking` · **APK/AAB 包体积瘦身体系化方案** `核心常考` `对比表`
    - 核心关键词：`minifyEnabled` + R8 优化资源裁剪（`android.enableR8.optimizedResourceShrinking`）、WebP/AVIF 压缩、`.so` ABI 裁剪与动态下发
87. `android.adb-debugging-commands` · **Android 工程师高频 `ADB` 调试与系统诊断指令清单** `核心常考` `对比表`
    - 核心关键词：`adb logcat` 过滤与导出、`dumpsys activity top / meminfo / gfxinfo / battery`、`am start` / `pm list`、`adb bugreport`、`reverse`/`forward` 端口转发

### 08-02 模块化路由与 WebView / JSBridge（3 题）
88. `android.modular-routing-asm` · **多模块组件化通信与路由实现（SPI、APT/KSP 与 AGP 8 `AsmClassVisitorFactory`）** `核心常考` `Mermaid`
    - 核心关键词：模块分层解耦（App/Biz/Base）、SPI 接口下沉、编译期生成路由表 vs AGP 8 `AsmClassVisitorFactory` 字节码插桩注册（取代已移除的 Transform API）
89. `android.webview-lifecycle-optimization` · **`WebView` 核心机制、独立进程隔离、秒开优化与白屏/泄漏治理** `核心常考` `Mermaid`
    - 核心关键词：独立进程隔离防主进程 Crash/OOM、预创建 WebView 复用池、`shouldInterceptRequest` 离线包拦截、Cookie/缓存策略与动态创建+主动销毁防泄漏
90. `android.webview-jsbridge-security` · **Android 与前端 `JSBridge` 双向通信原理与安全防线** `核心常考` `Mermaid`
    - 核心关键词：Native 调 JS（`evaluateJavascript` 异步回调）vs JS 调 Native（`@JavascriptInterface` 注入、URL Scheme 拦截、`onJsPrompt` 拦截）、主线程切换与域名白名单防任意方法调用

### 08-03 安全合规、权限、WindowInsets 与版本适配（5 题）
91. `android.client-security-keystore` · **客户端通信安全、本地敏感存储与防逆向基础防线** `核心常考` `对比表`
    - 核心关键词：HTTPS + SSL Pinning 防抓包、`AndroidKeyStore` 硬件密钥存储、签名校验与防调试基础
92. `android.window-insets-edge-to-edge` · **`WindowInsets`、`enableEdgeToEdge()` 沉浸式适配与软键盘动画联动** `核心常考` `Mermaid`
    - 核心关键词：`WindowInsetsCompat`（`systemBars()`、`ime()`、`displayCutout()`）、`enableEdgeToEdge()` 统一处理状态栏/导航栏内边距、`WindowInsetsAnimationCompat` 键盘跟手动画
93. `android.permissions-evolution-compliance` · **Android 运行时权限全版本演进与隐私合规实战** `核心常考` `对比表`
    - 核心关键词：6.0 动态权限与 `shouldShowRequestPermissionRationale`、10–11 后台定位分离、12 近似定位与蓝牙权限、13 细分媒体权限与通知权限、14 部分照片访问（`READ_MEDIA_VISUAL_USER_SELECTED`）
94. `android.screen-adaptation-foldable` · **屏幕适配原理（`dp/sp/density`、`SmallestWidth`）与折叠屏/大屏适配** `核心常考` `对比表`
    - 核心关键词：px 与 dp 换算、`smallestWidth` 限定符、屏幕等比例缩放方案、Jetpack `WindowManager` 折叠态与自适应双栏布局
95. `android.version-adaptation-10-16` · **Android 10–16 核心版本适配总览（存储、后台启动、预测性返回与 16KB 页大小）** `核心常考` `对比表`
    - 核心关键词：Scoped Storage 分区存储、14 前台服务类型、15 16KB Page Size 对齐、16 强制 Edge-to-Edge、预测性返回（Predictive Back）与大屏忽略锁定方向限制

---

## 09 · 算法、数据结构与客户端高频场景题（7 题）

### 09-01 面试手写高频数据结构、算法模式与并发（4 题）
96. `android.algo-lru-cache` · **手写 `LRU Cache` 核心思路与 Android `LruCache` 源码差异** `高频必考` `Mermaid`
    - 核心关键词：`HashMap` + 双向链表 O(1) 淘汰、`LinkedHashMap(accessOrder = true)`、Android `LruCache` 字节数控制（`sizeOf`）与线程安全
97. `android.algo-multithread-sync` · **多线程交替打印与经典生产者-消费者模型** `核心常考` `Mermaid`
    - 核心关键词：`wait/notifyAll` 防虚假唤醒（`while`）、`ReentrantLock` 多 `Condition` 精准唤醒、Kotlin `Channel` 挂起实现
98. `android.algo-view-tree-linkedlist` · **客户端高频树/链表问题（View 树层序遍历、最近公共父容器、链表反转与环检测）** `核心常考` `Mermaid`
    - 核心关键词：BFS 层序求 View 树深度/最大宽度、DFS 寻找两子 View 最近公共父 ViewGroup、快慢双指针
99. `android.algo-hot100-patterns` · **常用数据结构复杂度选型与客户端高频手撕算法模式（Hot100 核心子集）** `中级加分` `对比表`
    - 核心关键词：数组/链表/栈队列/哈希表/堆（优先级队列）/二叉树/前缀树时间空间选型；双指针、滑动窗口、单调栈、二叉树递归与经典 DP 模板

### 09-02 客户端综合系统设计场景题（3 题）
100. `android.scenario-multi-downloader` · **场景设计：高可靠的多任务断点续传下载器架构** `核心常考` `Mermaid`
     - 核心关键词：HTTP `Range` 与 `206 Partial Content`、`RandomAccessFile` 分块写入、数据库分片进度持久化、并发限流与文件校验
101. `android.scenario-feed-performance` · **场景设计：千万级 Feed 列表防卡顿、防闪烁与精准曝光埋点去重** `核心常考` `Mermaid`
     - 核心关键词：多 ViewType Pool 复用、图片预加载与滑动暂停、异步布局预加载、基于可视比例（>=50%）与停留时长（>=1s）曝光去重
102. `android.scenario-im-weak-network` · **场景设计：IM 长连接通道架构与弱网消息“不丢、不重、有序”保障** `中级加分` `Mermaid`
     - 核心关键词：TCP/WebSocket 心跳自适应退避、`clientMsgId` 本地去重 + 服务端全局 `seqId` 补洞拉取、ACK 超时重传状态机

---

## 10 · NDK、多媒体、图像处理与 BLE 蓝牙（9 题）

### 10-01 NDK / JNI 与 C++ 跨层基础（2 题）
103. `android.ndk-jni-lifecycle` · **JNI 原理、静态/动态注册（`JNI_OnLoad`）与局部/全局引用管理** `核心常考` `Mermaid`
     - 核心关键词：方法签名映射、`JNIEnv` 线程私有绑定（跨线程需 `JavaVM->AttachCurrentThread`）、`NewGlobalRef` 与局部引用表防 512 上限溢出
104. `android.ndk-cmake-so-debug` · **`CMakeLists.txt` 构建、ABI 兼容与 `.so` 加载排查基础** `中级加分` `对比表`
     - 核心关键词：`abiFilters`（`arm64-v8a` / `armeabi-v7a`）、`System.loadLibrary` 搜索路径与 `UnsatisfiedLinkError` 定位、`nm`/`readelf` 查符号

### 10-02 音视频开发与系统媒体库（MediaStore / 图片视频加载）（3 题）
105. `android.media-codec-pipeline` · **`MediaCodec` 硬编解码原理、状态机与 `Surface` 零拷贝渲染** `核心常考` `Mermaid`
     - 核心关键词：异步/同步 `InputBuffer` 与 `OutputBuffer` 队列、`MediaExtractor` 解封装、直接输出到 `Surface` 跳过 YUV→RGB CPU 拷贝、软解兜底
106. `android.media-exoplayer-audio` · **`ExoPlayer`（Media3）缓冲架构、首帧秒开优化与 `AudioFocus` 管理** `核心常考` `Mermaid`
     - 核心关键词：`MediaSource` / `LoadControl` / `Renderer` 分层、`DefaultLoadControl` 起播缓冲阈值调优、HLS/DASH 自适应码率、音视频 PTS 同步与音频焦点抢占监听
107. `android.media-store-picker-loader` · **系统媒体库（`MediaStore`/`PhotoPicker`）与本地图片/视频封面加载实战** `核心常考` `Mermaid`
     - 核心关键词：`ContentResolver` 查询 `MediaStore.Images`/`Video` 分页加载（`Bundle` 传 `LIMIT/OFFSET` 适配 Android 11+）、系统 `PhotoPicker` 免权限选图、Glide/Coil 加载本地 `content://` Uri 与视频帧解码（`VideoDecoder`/`MediaMetadataRetriever`）

### 10-03 图像处理与高斯模糊（2 题）
108. `android.image-blur-techniques` · **Android 高斯模糊方案演进与性能对比（`RenderEffect` / AGSL / OpenGL / NDK）** `核心常考` `对比表`
     - 核心关键词：已弃用 `RenderScript`（Android 12+ 替代工具包）、Android 12+ 原生 `RenderEffect.createBlurEffect`、Android 13+ AGSL `RuntimeShader`、低版本降采样 + C++/NDK StackBlur 或 OpenGL 多 Pass 卷积优化
109. `android.image-processing-apis` · **Android 常用图像处理接口（`Canvas`/`Paint`/`ColorMatrix`/`PorterDuff`、`Matrix` 与大图解码）** `核心常考` `对比表`
     - 核心关键词：`Paint` 滤镜与 `ColorMatrix` 调色、`PorterDuffXfermode` 混合模式（圆角/遮罩）、`Matrix` 仿射变换（前乘 `pre` / 后乘 `post`）、`ImageDecoder` 替代 `BitmapFactory`、`BitmapRegionDecoder` 区域解码与 `ExifInterface` 旋转矫正

### 10-04 蓝牙 BLE（低功耗蓝牙）核心原理与实战（2 题）
110. `android.ble-gatt-architecture` · **BLE 低功耗蓝牙架构、GATT 协议与连接通信状态机** `核心常考` `Mermaid`
     - 核心关键词：广播与扫描（Advertising/Scanning）、GATT C/S 架构（`Service` → `Characteristic` → `Descriptor`）、`connectGatt` → `discoverServices` → 开启 `Notification`（写 CCCD `0x2902`）、MTU 协商（默认 23B 扩至 512B）与大数据分包读写
111. `android.ble-stability-permissions` · **BLE 连接稳定性治理（GATT 133 / 串行队列）与 Android 12+ 蓝牙权限适配** `中级加分` `对比表`
     - 核心关键词：GATT 操作异步单工串行队列封装（防并发读写丢回调）、经典 `status 133` 异常重试与 `autoConnect` 权衡、Android 12+ `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` 新权限及 `neverForLocation` 标记免定位权限

---

## 远期按需可选专题（未纳入当前 111 题）

- **项目深挖与 STAR 行为面试专题**（技术难点包装、线上故障复盘模板、技术选型答辩）
- **插件化深入架构**（Hook AMS 启动未注册 Activity、资源合并隔离与高版本受限现状）
