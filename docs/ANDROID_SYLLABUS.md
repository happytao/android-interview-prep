# Android 中级开发工程师面试知识大纲（Phase 1 待审定稿）

> **审阅与调整指引**  
> 本大纲严格按照**中级 Android 开发工程师（2–5 年经验）**主流面试广度与深度校准：聚焦**答题思路、核心原理解析、高价值图解、高频追问与关键词**，避免纯背 API 或过度深入底层 C++ 源码细枝末节。  
> 请逐项审阅以下 **9 个一级分类（L1）、27 个二级专题（L2）、78 道精选核心题**。你可以直接告诉我需要**补充**的专题（如 NDK/JNI、音视频、蓝牙/BLE、插件化/热修复深入、跨端 Flutter/KMP）或**删减/降权**的条目（如 Jetpack Compose、算法手写比重等）。确认后即可进入 Phase 2 开发与内容精编！

---

## 知识全景总览

| 序号 | 一级分类（L1） | 二级专题数（L2） | 题目数量 | 交互 SVG 规划 | 核心考察目标 |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 01 | Kotlin 与 Java 核心基础 | 3 | 12 | 1 | 协程 CPS 状态机、结构化并发、JVM/ART 并发与内存 |
| 02 | Android 四大组件与生命周期 | 3 | 8 | 2 | 组件交错时序、任务栈、冷启动全链路与状态恢复 |
| 03 | Android Framework 核心机制 | 3 | 10 | 2 | Handler/epoll、Binder mmap、进程模型与 Window 体系 |
| 04 | View 渲染、事件分发与自定义 View | 4 | 10 | 3 | 事件 U 型分发、VSync 渲染管线、RecyclerView 四级缓存 |
| 05 | Jetpack 组件与主流架构模式 | 3 | 8 | 1 | Lifecycle/ViewModel 原理、StateFlow、UDF 架构演进 |
| 06 | 网络通信、图片加载与三方库原理 | 3 | 8 | 2 | OkHttp 拦截器链、Glide 三级缓存、MMKV/DataStore |
| 07 | 性能优化与稳定性治理 | 3 | 9 | 1 | LeakCanary/内存排查、启动卡顿优化、ANR 与 Crash 闭环 |
| 08 | 工程化、构建、安全与适配 | 3 | 7 | 1 | APK 打包签名、Gradle 提速、组件化路由、安全与高版本适配 |
| 09 | 算法与客户端高频场景题 | 2 | 6 | 0 | 手写 LRU/多线程并发、断点续传、Feed 优化、IM 弱网设计 |
| **合计** | **9 个一级分类** | **27 个二级专题** | **78 题** | **13 个交互 SVG + Mermaid 全覆盖** | **完整对齐中级 Android 面试标准** |

---

## 01 · Kotlin 与 Java 核心基础（12 题）

### 01-01 Kotlin 协程与挂起原理（4 题）
- [x] **A-01-01** Kotlin 协程本质与 `suspend` 挂起/恢复（CPS 状态机）原理 `高频必考` `交互SVG`
  - **核心关键词**：轻量级线程抽象、`Continuation` 回调、`label` 状态机、`COROUTINE_SUSPENDED`、非阻塞挂起
- [x] **A-01-02** `CoroutineScope`、结构化并发与异常传播（`Job` vs `SupervisorJob`） `高频必考` `Mermaid`
  - **核心关键词**：父子 Job 树、结构化取消传播、`SupervisorJob` 异常隔离、`CoroutineExceptionHandler` 生效边界
- [x] **A-01-03** 协程调度器（`Dispatchers`）切换机制与线程阻塞陷阱（`withContext` vs `launch`） `核心常考` `Mermaid`
  - **核心关键词**：`ContinuationInterceptor`、`Dispatchers.Main.immediate`、`IO` 与 `Default` 共享线程池、`runBlocking` 死锁风险
- [x] **A-01-04** `Flow` 冷流、`StateFlow` 与 `SharedFlow` 原理及背压/生命周期安全采集 `高频必考` `对比表`
  - **核心关键词**：冷流按需触发、`buffer`/`conflate`/`collectLatest` 背压、`replay` 缓存、`repeatOnLifecycle` 防后台泄漏

### 01-02 Kotlin 语言核心机制（4 题）
- [x] **A-01-05** `inline`、`noinline`、`crossinline` 与 `reified` 泛型实化原理 `高频必考` `对比表`
  - **核心关键词**：字节码内联消除函数对象、非局部返回控制、`crossinline` 禁止跨作用域 return、类型擦除绕过
- [x] **A-01-06** Kotlin 委托属性（`by lazy`、`Delegates.observable`）与作用域函数差异 `核心常考` `对比表`
  - **核心关键词**：`getValue`/`setValue` 字节码生成、`LazyThreadSafetyMode` 双重校验锁、`let/run/with/apply/also` 上下文与返回值
- [x] **A-01-07** `sealed class`/`sealed interface`、`data class` 与空安全底层字节码实现 `核心常考` `Mermaid`
  - **核心关键词**：受限继承穷尽检查、`componentN`/`copy`、Java `@Nullable`/`Intrinsics.checkNotNullParameter` 断言
- [x] **A-01-08** 高阶函数捕获变量与 Lambda 在 JVM 上的内存分配优化 `中级加分` `Mermaid`
  - **核心关键词**：`FunctionN` 接口实例化、`Ref.IntRef` 装箱开销、无捕获 Lambda 单例复用

### 01-03 Java 并发、集合与 JVM/ART 基础（4 题）
- [x] **A-01-09** `synchronized` 锁升级、`ReentrantLock`（AQS）与 `volatile`（JMM/内存屏障） `高频必考` `Mermaid`
  - **核心关键词**：对象头 Mark Word、偏向/轻量级/重量级锁、AQS CLH 队列与 CAS、可见性与禁止指令重排
- [x] **A-01-10** `ThreadPoolExecutor` 核心参数、工作流程与 Android 常见线程池选型 `高频必考` `Mermaid`
  - **核心关键词**：核心线程 → 阻塞队列 → 最大线程 → 拒绝策略、核心线程超时回收、避免无界队列 OOM
- [x] **A-01-11** `HashMap`（1.8 红黑树演进）、`ConcurrentHashMap` 与 `SparseArray`/`ArrayMap` 对比 `高频必考` `对比表`
  - **核心关键词**：扰动函数、树化阈值 8/6、CAS + `synchronized` 桶锁、二分查找省内存装箱
- [x] **A-01-12** JVM/ART 垃圾回收机制（可达性分析、四种引用、ART 并发压缩与分代） `核心常考` `Mermaid`
  - **核心关键词**：GC Roots 类型、强软弱虚引用、Concurrent Copying (CC)、Tlab/Region 内存碎片治理

---

## 02 · Android 四大组件与生命周期（8 题）

### 02-01 Activity 生命周期、启动模式与状态保存（4 题）
- [x] **A-02-01** Activity 完整生命周期与前后台切换 / A 启动 B 的生命周期交错时序 `高频必考` `交互SVG`
  - **核心关键词**：`A.onPause` → `B.onCreate/onStart/onResume` → `A.onStop`、透明主题不触发 `onStop`、耗时操作避坑
- [x] **A-02-02** 4 种 `launchMode`、`Intent Flag` 组合与任务栈（TaskAffinity）调度机制 `高频必考` `Mermaid`
  - **核心关键词**：`standard`/`singleTop`/`singleTask`/`singleInstance`、`onNewIntent`、`FLAG_ACTIVITY_CLEAR_TOP`
- [x] **A-02-03** 配置变更重建（`onSaveInstanceState` / `Bundle` 容量限制）与进程被杀恢复机制 `核心常考` `Mermaid`
  - **核心关键词**：`onSaveInstanceState` 时机变化（API 28+ `onStop` 之后）、View 状态恢复 id 要求、Binder 1MB 限制规避
- [x] **A-02-04** 从桌面点击图标到 Activity 首帧显示（冷启动全链路） `高频必考` `交互SVG`
  - **核心关键词**：Launcher → `ATMS/AMS` Binder → Zygote `fork` → `ActivityThread.main` → `LoadedApk`/H Handler → `ViewRootImpl` 首帧

### 02-02 Service、BroadcastReceiver 与跨进程限制（2 题）
- [x] **A-02-05** `startService` vs `bindService` 生命周期差异、后台限制与前台服务适配 `核心常考` `Mermaid`
  - **核心关键词**：`onStartCommand` 返回值、混合绑定销毁条件、Android 8.0 后台限制、`foregroundServiceType` 强制声明
- [x] **A-02-06** 静态/动态广播原理、`LocalBroadcastManager` 淘汰与替代方案 `核心常考` `对比表`
  - **核心关键词**：AMS 广播队列派发、`goAsync()` 超时、`LocalBroadcastManager` 弃用原因、`SharedFlow` 进程内事件分发

### 02-03 ContentProvider 与 Fragment 高频机制（2 题）
- [x] **A-02-07** `ContentProvider` 跨进程数据共享与启动初始化时机（App Startup） `核心常考` `Mermaid`
  - **核心关键词**：匿名共享内存 + `CursorWindow`、先于 `Application.onCreate()` 初始化、Jetpack `App Startup` 合并优化
- [x] **A-02-08** Fragment 生命周期、`ViewPager2` 懒加载与 `commitAllowingStateLoss` 异常原理 `高频必考` `Mermaid`
  - **核心关键词**：`FragmentManager` 回退栈与事务、`setMaxLifecycle(RESUMED)`、`Can not perform this action after onSaveInstanceState`

---

## 03 · Android Framework 核心机制（10 题）

### 03-01 Handler 消息机制与异步调度（4 题）
- [x] **A-03-01** `Handler`、`Looper`、`MessageQueue` 协作与 Linux `epoll` 休眠唤醒机制 `高频必考` `交互SVG`
  - **核心关键词**：单链表按 `when` 排序、`nativePollOnce` / `nativeWake`、`eventfd` 管道通信、`Message.obtain()` 对象池复用
- [x] **A-03-02** 为什么主线程 `Looper.loop()` 死循环不会引起 ANR？ `高频必考` `Mermaid`
  - **核心关键词**：无消息时内核态休眠让出 CPU、ANR 本质是事件在超时阈值内未得到处理、消息驱动事件模型
- [x] **A-03-03** 同步屏障（SyncBarrier）、异步消息与 VSync 渲染高优先级调度原理 `高频必考` `Mermaid`
  - **核心关键词**：`target == null` 屏障消息、`Message.setAsynchronous(true)`、`Choreographer` 优先取帧消息、屏障防泄漏移除
- [x] **A-03-04** `ThreadLocal` 线程隔离原理、`IdleHandler` 触发时机与 `Handler` 内存泄漏治理 `高频必考` `对比表`
  - **核心关键词**：`ThreadLocalMap` 线性探测与 `WeakReference` Key 内存泄漏、`queueIdle()` 延迟初始化、静态内部类 + 弱引用

### 03-02 Binder IPC 与进程模型（4 题）
- [x] **A-03-05** Binder 一次拷贝原理（`mmap` 内存映射）与传统 IPC 对比优势 `高频必考` `交互SVG`
  - **核心关键词**：内核空间与接收方用户空间映射同一物理页、`copy_from_user` 1 次拷贝、UID/PID 身份鉴权与安全性
- [x] **A-03-06** AIDL 通信流程（Proxy/Stub、`ServiceManager`、线程池与死亡代理） `核心常考` `Mermaid`
  - **核心关键词**：`asInterface` 本地/跨进程判别、transact/onTransact、Binder 线程池上限（默认 15+1）、`linkToDeath` 重连
- [x] **A-03-07** `TransactionTooLargeException` 成因与大跨进程传参治理策略 `核心常考` `对比表`
  - **核心关键词**：1MB 总映射空间（oneway 异步仅一半 512KB）、Bundle 大图/长列表踩坑、文件/MemoryFile/SharedMemory 方案
- [x] **A-03-08** Android 进程优先级分类（LMKD 查杀策略）、Zygote `fork` 与进程保活边界 `中级加分` `对比表`
  - **核心关键词**：`oom_adj` 评分、Foreground/Visible/Service/Cached 进程、Copy-on-Write 预加载资源、合规后台任务替代

### 03-03 Context、Window 与系统服务（2 题）
- [x] **A-03-09** `Application`、`Activity`、`Service` Context 差异与 Dialog 弹窗报错本质 `高频必考` `对比表`
  - **核心关键词**：`ContextImpl` 委托、`ContextThemeWrapper` 主题能力、`Token` 窗口归属校验、`getApplicationContext()` 避坑
- [x] **A-03-10** `Window`、`PhoneWindow`、`DecorView`、`WMS` 与 `Surface` 关系梳理 `核心常考` `Mermaid`
  - **核心关键词**：`WindowManagerImpl` → `WindowManagerGlobal`、`ViewRootImpl` 桥梁、`WMS` 统一调度窗口层级与输入焦点

---

## 04 · View 渲染、事件分发与自定义 View（10 题）

### 04-01 事件分发与嵌套滑动（3 题）
- [x] **A-04-01** 触摸事件分发 U 型链路（Activity → PhoneWindow → DecorView → ViewGroup → View） `高频必考` `交互SVG`
  - **核心关键词**：`dispatchTouchEvent` / `onInterceptTouchEvent` / `onTouchEvent`、责任链消费、`mFirstTouchTarget` 缓存
- [x] **A-04-02** `ACTION_CANCEL` 触发条件、`requestDisallowInterceptTouchEvent` 与滑动冲突解法 `高频必考` `Mermaid`
  - **核心关键词**：父容器半路拦截下发 `CANCEL`、外部拦截法 vs 内部拦截法（注意 `ACTION_DOWN` 不可禁止拦截）
- [x] **A-04-03** `NestedScrollingParent3` / `NestedScrollingChild3` 嵌套滑动协作机制 `核心常考` `Mermaid`
  - **核心关键词**：`onNestedPreScroll` 先让父布局消费、剩余距离再交子 View、`CoordinatorLayout + Behavior` 联动基础

### 04-02 View 绘制流程与屏幕刷新原理（3 题）
- [x] **A-04-04** `ViewRootImpl` 触发 `performTraversals`（Measure/Layout/Draw）与 `MeasureSpec` 规则 `高频必考` `Mermaid`
  - **核心关键词**：32 位 int 高 2 位 Mode + 低 30 位 Size、`EXACTLY`/`AT_MOST`/`UNSPECIFIED`、子 View 与父容器共同决定尺寸
- [x] **A-04-05** `invalidate()`、`postInvalidate()` 与 `requestLayout()` 核心差异与触发条件 `核心常考` `对比表`
  - **核心关键词**：`invalidate` 只走 `draw`（需硬件/脏区重绘）、`postInvalidate` Handler 切主线程、`requestLayout` 置 `FORCE_LAYOUT`
- [x] **A-04-06** VSync 信号、`Choreographer` 调度、双缓冲/三缓冲与丢帧（Jank）原理 `高频必考` `交互SVG`
  - **核心关键词**：16.6ms（60Hz）/ 8.3ms（120Hz）节奏、Input → Animation → Traversal 回调队列、CPU/GPU 流水线与 SurfaceFlinger 合成

### 04-03 RecyclerView 核心原理与性能调优（2 题）
- [x] **A-04-07** `RecyclerView` 四级缓存机制（Scrap / CacheView / Extension / RecycledViewPool） `高频必考` `交互SVG`
  - **核心关键词**：`mAttachedScrap` 屏幕内复用、`mCachedViews`（默认 2 个不需 rebind）、`RecycledViewPool` 按 `viewType` 共享（默认 5 个）
- [x] **A-04-08** `RecyclerView` 局部刷新（`DiffUtil` + Payload）、预取（Prefetch）与卡顿优化 `高频必考` `对比表`
  - **核心关键词**：`AsyncListDiffer` / `ListAdapter`、`GapWorker` 帧间隙提前 bind、固定高度 `setHasFixedSize`、共享 Pool

### 04-04 自定义 View 与动画机制（2 题）
- [x] **A-04-09** 自定义 View 关键避坑与 `SurfaceView`/`TextureView` 渲染选型 `核心常考` `对比表`
  - **核心关键词**：`AT_MOST` 下 `wrap_content` 兜底、Padding 处理、`SurfaceView` 独立 Surface 挖洞无动画 vs `TextureView` 硬件层支持变换
- [x] **A-04-10** 属性动画（`ValueAnimator` / `ObjectAnimator`）驱动原理与生命周期防泄漏 `核心常考` `Mermaid`
  - **核心关键词**：`AnimationHandler` 注册 VSync、`TimeInterpolator` + `TypeEvaluator`、反射/PropertyValuesHolder、`onDestroy` 必须 `cancel()`

---

## 05 · Jetpack 组件与主流架构模式（8 题）

### 05-01 Lifecycle、ViewModel 与 State 驱动（3 题）
- [x] **A-05-01** `Lifecycle` 感知原理（`ReportFragment` / `ComponentActivity` 状态机分发生命周期事件） `高频必考` `Mermaid`
  - **核心关键词**：观察者模式 + 状态机（INITIALIZED → RESUMED）、低版本透明 `ReportFragment` 注入、`DefaultLifecycleObserver`
- [x] **A-05-02** `ViewModel` 屏幕旋转不销毁原理（`NonConfigurationInstances`）与 `SavedStateHandle` `高频必考` `交互SVG`
  - **核心关键词**：`ActivityThread` 暂存 `NonConfigurationInstances`、`ViewModelStore` 复用、`onCleared()` 解绑时机、进程被杀配合 SavedStateHandle
- [x] **A-05-03** `LiveData` 粘性事件成因、`setValue`/`postValue` 差异与 `StateFlow` 替代优势 `高频必考` `对比表`
  - **核心关键词**：`mVersion` 与 `mLastVersion` 比对机制、`postValue` 丢数据风险（连续覆盖）、`SingleLiveEvent` vs `SharedFlow/Channel`

### 05-02 Navigation、Room、WorkManager 与 Compose 基础（3 题）
- [x] **A-05-04** `Room` 编译期校验、事务与 SQLite WAL 模式 / 数据库平滑升级策略 `核心常考` `Mermaid`
  - **核心关键词**：APT/KSP 生成 DAO 实现、WAL（Write-Ahead Logging）读写并发、`AutoMigration` 与破坏性迁移兜底
- [x] **A-05-05** `WorkManager` 后台调度封装原理与省电约束保证 `核心常考` `Mermaid`
  - **核心关键词**：API 23+ `JobScheduler` 底层委托、持久化任务队列（Room 存储）、Doze 模式兼容性与加急任务 `Expedited`
- [x] **A-05-06** Jetpack Compose 核心原理与思维转变（声明式 UI、重组作用域与状态快照） `中级加分` `Mermaid`
  - **核心关键词**：`State<T>` 快照系统（Snapshot）、智能跳过重组（Stability 稳定类型）、`remember` 与 `SlotTable` 位置记忆

### 05-03 客户端架构演进与依赖注入（2 题）
- [x] **A-05-07** MVC / MVP / MVVM / MVI 架构对比与单向数据流（UDF）落地权衡 `高频必考` `对比表`
  - **核心关键词**：P 层内存泄漏与接口膨胀、MVVM 双向耦合痛点、MVI `Intent → ViewState + SideEffect` 唯一可信数据源
- [x] **A-05-08** Hilt / Koin 依赖注入原理对比与作用域管理 `中级加分` `对比表`
  - **核心关键词**：Dagger2 编译期生成零反射（Hilt 绑定 Android 生命周期组件）vs Koin 运行时 DSL Service Locator

---

## 06 · 网络通信、图片加载与三方库原理（8 题）

### 06-01 OkHttp 与 Retrofit 核心机制（3 题）
- [x] **A-06-01** `OkHttp` 责任链拦截器机制（五大内置拦截器顺序与自定义拦截器挂载点） `高频必考` `交互SVG`
  - **核心关键词**：`RetryAndFollowUp` → `Bridge` → `Cache` → `Connect` → `CallServer`、`addInterceptor` vs `addNetworkInterceptor`
- [x] **A-06-02** `OkHttp` 连接池复用、`Dispatcher` 调度与 HTTP/2 多路复用原理 `核心常考` `Mermaid`
  - **核心关键词**：最大空闲 5 连接 / 5 分钟保活（`RealConnectionPool`）、并发 64 / 同主机 5 请求队列、Stream 帧并发防队头阻塞
- [x] **A-06-03** `Retrofit` 动态代理 + `CallAdapter`/`Converter` 扩展与协程 `suspend` 集成原理 `高频必考` `Mermaid`
  - **核心关键词**：`Proxy.newProxyInstance` 解析注解构建 `ServiceMethod`、`SuspendForBody` 自动包装 `enqueue` 与 `suspendCancellableCoroutine`

### 06-02 图片加载库（Glide / Coil）原理（3 题）
- [x] **A-06-04** `Glide` 生命周期绑定机制与请求自动暂停/取消时机 `高频必考` `Mermaid`
  - **核心关键词**：`RequestManagerRetriever` 注入不可见 `RequestManagerFragment`（新版集成 Jetpack `Lifecycle`）、Application 作用域差异
- [x] **A-06-05** `Glide` 三级缓存（ActiveResources → MemoryCache → DiskLruCache）读写全链路 `高频必考` `交互SVG`
  - **核心关键词**：弱引用活动缓存防正在使用的图被 LRU 踢出、`LruResourceCache`、`DiskLruCache`（SOURCE 原图 vs RESULT 转换图）
- [x] **A-06-06** 大图加载 OOM 防护（采样与复用）与现代图片库 `Coil` 优势 `核心常考` `对比表`
  - **核心关键词**：`inJustDecodeBounds` + `inSampleSize`、`inBitmap` 内存复用、`Hardware Bitmap`、`Coil` 基于 Kotlin 协程与 OkHttp

### 06-03 本地存储与序列化方案选型（2 题）
- [x] **A-06-07** `SharedPreferences` 缺陷（全量 XML / UI `fsync` 卡顿）与 `MMKV` / `DataStore` 对比 `高频必考` `对比表`
  - **核心关键词**：`QueuedWork.waitToFinish()` 引发 `onStop` ANR、`MMKV` 基于 `mmap` + Protobuf 增量追加写、`DataStore` 协程异步原子写
- [x] **A-06-08** 序列化方案选型对比（`Serializable` vs `Parcelable`、`Gson` vs `Moshi`/`kotlinx.serialization`） `核心常考` `对比表`
  - **核心关键词**：反射 I/O 开销 vs 内存直写、Kotlin 空安全字段缺失陷阱（Gson 反射绕过默认值）、编译期无反射序列化

---

## 07 · 性能优化与稳定性治理（9 题）

### 07-01 内存优化与 OOM / 泄漏治理（3 题）
- [x] **A-07-01** `LeakCanary` 自动检测内存泄漏原理（`WeakReference` + `ReferenceQueue` + 堆分析） `高频必考` `交互SVG`
  - **核心关键词**：`AppWatcher` 监听 Destroy 回调、延迟 5s + 手动触发 GC 判别、Shark 解析 Hprof 最短 GC Root 引用链
- [x] **A-07-02** 高频内存泄漏场景排查清单与治理模板 `高频必考` `对比表`
  - **核心关键词**：非静态内部类/匿名 Runnable 持有外部引用、单例持 Activity Context、动画/RxJava/监听未解绑、WebView 独立进程销毁
- [x] **A-07-03** Java Heap / Native 内存 / FD 与线程数溢出排查思路 `核心常考` `Mermaid`
  - **核心关键词**：OOM 不一定是 Java 堆满（`pthread_create` 失败/虚拟内存不足/FD 上限 1024）、Android Profiler / `dumpsys meminfo` / KOOM

### 07-02 启动速度、卡顿与功耗优化（3 题）
- [x] **A-07-04** App 冷启动拆解与系统性提速实践（TTID / TTFD 指标） `高频必考` `Mermaid`
  - **核心关键词**：Application 异步任务 DAG 拓扑编排、`IdleHandler` 延迟非首屏初始化、SplashScreen 主题占位、主页布局扁平化与骨架屏
- [x] **A-07-05** 界面卡顿（UI Jank）线上监控与线下定位工具链 `高频必考` `Mermaid`
  - **核心关键词**：`Looper.setMessageLogging` 耗时抓取、`Choreographer.FrameCallback` 掉帧计算、Systrace / Perfetto 看主线程锁等待与 Binder 阻塞
- [x] **A-07-06** 网络、流量与电量消耗优化要点 `中级加分` `对比表`
  - **核心关键词**：接口聚合与 Protobuf 压缩、HTTP 缓存与断网退避、后台定位与 WakeLock 超时兜底

### 07-03 崩溃与 ANR 稳定性监控（3 题）
- [x] **A-07-07** ANR 触发阈值、`traces.txt` 核心字段解读与死锁/IO 现场归因 `高频必考` `Mermaid`
  - **核心关键词**：Input 5s / 前台 Broadcast 10s / 后台 60s / 前台 Service 20s、`main` 线程状态（`Blocked`/`Native`/`Waiting`）、主线程查库/SP 阻塞
- [x] **A-07-08** Java Crash 与 Native Crash（Signal / Tombstone）收集与还原机制 `核心常考` `Mermaid`
  - **核心关键词**：`Thread.setDefaultUncaughtExceptionHandler` 链路透传、`sigaction` 注册 `SIGSEGV/SIGABRT`、备用栈防栈溢出、`addr2line` 符号化
- [x] **A-07-09** 线上疑难卡死归因与灰度发布 / 降级止损闭环机制 `中级加分` `Mermaid`
  - **核心关键词**：Watchdog 子线程探测主线程心跳、Crash 率阈值自动熔断、Feature Flag 远程开关降级

---

## 08 · 工程化、构建、安全与适配（7 题）

### 08-01 Gradle 构建与包体积优化（3 题）
- [x] **A-08-01** APK 打包构建全流程（AAPT2、D8/R8、资源压缩与 V1–V4 签名差异） `高频必考` `交互SVG`
  - **核心关键词**：`resources.arsc` 与 `R.java`、D8 脱糖、R8 混淆+裁剪、V1 JAR 签名 vs V2/V3 全文件块校验防篡改、V4 流式安装
- [x] **A-08-02** Gradle 构建提速实践（Configuration Cache、KSP 替代 KAPT 与模块化） `核心常考` `对比表`
  - **核心关键词**：`Configuration/Execution` 生命周期、配置缓存与本地/远程 Build Cache、KSP 免生成 Java 存根提速、并行与按需配置
- [x] **A-08-03** APK 包体积瘦身体系化方案 `核心常考` `对比表`
  - **核心关键词**：`minifyEnabled` + `shrinkResources`、WebP/AVIF 压缩与资源混淆（AndResGuard/resConfig）、`.so` ABI 裁剪与动态下发、AAB

### 08-02 组件化、模块化与混合容器（2 题）
- [x] **A-08-04** 多模块组件化通信与路由实现原理 `核心常考` `Mermaid`
  - **核心关键词**：模块解耦分层（App/Biz/Common）、SPI 接口下沉注册、APT/KSP 生成映射表 vs ASM 字节码插桩防启动扫描耗时
- [x] **A-08-05** WebView / Hybrid 容器深度优化（秒开、离线包与通信安全） `核心常考` `Mermaid`
  - **核心关键词**：独立进程防主进程 OOM、预创建 WebView 池、`shouldInterceptRequest` 离线资源拦截、`@JavascriptInterface` API17+ 与域名白名单

### 08-03 安全合规与系统版本适配（2 题）
- [x] **A-08-06** 客户端通信安全、本地敏感存储与防逆向基础防线 `核心常考` `对比表`
  - **核心关键词**：HTTPS + SSL Pinning 防抓包、`AndroidKeyStore` 硬件加密密钥、敏感字段不硬编码、签名校验与防调试检测
- [x] **A-08-07** Android 10–15 近年核心版本适配清单 `核心常考` `对比表`
  - **核心关键词**：Scoped Storage 分区存储、`Package Visibility` 包可见性、Android 13 运行时通知权限、14 前台服务类型、15 Edge-to-Edge 与 16KB Page Size

---

## 09 · 算法与客户端高频场景题（6 题）

### 09-01 面试手写高频数据结构与并发编程（3 题）
- [x] **A-09-01** 手写 `LRU Cache` 核心思路与 `LruCache` 源码差异 `高频必考` `Mermaid`
  - **核心关键词**：`HashMap` + 双向链表 O(1) 读写淘汰、`LinkedHashMap(accessOrder = true)`、Android `LruCache` `sizeOf` 字节计数与线程安全
- [x] **A-09-02** 多线程交替打印与经典生产者-消费者模型 `核心常考` `Mermaid`
  - **核心关键词**：`wait/notifyAll` 虚假唤醒用 `while` 校验、`ReentrantLock` 多 `Condition` 精准唤醒、Kotlin `Channel` 挂起版
- [x] **A-09-03** 客户端高频树/链表问题（View 树遍历、最近公共父容器、链表反转与成环） `核心常考` `Mermaid`
  - **核心关键词**：BFS 层序求 View 树深度/最大宽度、DFS 递归寻找两子 View 最近公共父 ViewGroup、双指针快慢指针

### 09-02 客户端综合系统设计场景题（3 题）
- [x] **A-09-04** 场景设计：如何设计一个高可靠的多任务断点续传下载器？ `高频必考` `Mermaid`
  - **核心关键词**：HTTP `Range` 头与 `206 Partial Content`、`RandomAccessFile` 分块写入、数据库分片元数据持久化、速度平滑与 MD5 校验
- [x] **A-09-05** 场景设计：千万级 Feed 列表防卡顿、防闪烁与精准曝光埋点设计 `高频必考` `Mermaid`
  - **核心关键词**：多 ViewType Pool 复用、图片预加载与滑动暂停加载、异步布局预渲染、基于可视面积（>=50%）与停留时长（>=1s）防重曝光
- [x] **A-09-06** 场景设计：IM 长连接通道架构与弱网消息“不丢、不重、有序”保障 `中级加分` `Mermaid`
  - **核心关键词**：TCP/WebSocket 心跳自适应退避、本地自增 `clientMsgId` 去重 + 服务端全局递增 `seqId` 补洞拉取、ACK 超时重传状态机
