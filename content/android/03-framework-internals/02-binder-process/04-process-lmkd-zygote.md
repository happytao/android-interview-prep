---
id: android.process-lmkd-zygote
aliases: []
title: Android 进程优先级（oom_score_adj / LMKD 策略）、Zygote fork 与保活边界
summary: 理解 Android 五级进程优先级与 Linux oom_score_adj/LMKD 查杀顺序，剖析 Zygote fork 与现代系统下合规后台机制。
priority: bonus
difficulty: medium
frequency: 3
estimatedMinutes: 5
status: published
keywords:
  - oom_score_adj / LMKD
  - 五级进程优先级
  - Zygote fork 写时复制
  - 为什么不用 Binder 孵化进程
  - 合规保活 WorkManager/FCM
references:
  - title: Android Developers - Processes and app lifecycle
    url: https://developer.android.com/guide/components/activities/process-lifecycle
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Source - Low Memory Killer Daemon (lmkd)
    url: https://source.android.com/docs/core/perf/lmkd
    type: aosp
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **进程优先级模型**：Android 尽量保留已打开应用在内存缓存以加速热/温启动，当物理内存吃紧时由用户态守护进程 **`lmkd`（Low Memory Killer Daemon）** 根据内核维护的 **`oom_score_adj`** 分值**从高到低依次查杀**：空进程 > 缓存进程 > 服务进程 > 可见进程 > 前台进程。
- **Zygote `fork` 为何走 Socket 而非 Binder？**：Zygote 进程为了加速新进程创建预先加载大量类并开启多线程前处于受控状态；**POSIX 规定多线程进程调用 `fork()` 极易因子进程继承已加锁的互斥量而死锁**，而 Binder 驱动内部自带多线程池，因此 SystemServer 必须通过单线程循环监听 **Unix Domain Socket** 让 Zygote 安全 `fork()`，再利用 **Copy-on-Write** 共享只读资源内存。

## 核心原理解析

### 1. 五级进程优先级与 `oom_score_adj`
数值越低越安全（系统进程为负数）：
1. **Foreground（前台进程，`adj ≈ 0`）**：正在交互的前台 Activity、绑定到前台的 Service 或正在执行 `onReceive()` 的广播接收者、调用了 `startForeground()` 的前台服务；
2. **Visible（可见进程，`adj ≈ 100`）**：失去了焦点但部分可见（如弹出半透明 Dialog Activity 下方的页面）或绑定着可见组件的服务；
3. **Service（服务进程，`adj ≈ 500`）**：纯后台运行普通 `startService`（但现代系统长时间后台服务会被降级甚至限制运行）；
4. **Cached / Background（后台缓存进程，`adj ≈ 900+`）**：所有 Activity 均已 `onStop` 进入 LRU 缓存列表，最容易在内存紧张时被 `lmkd` 按最近最少使用淘汰；
5. **Empty（空进程）**：不再持有任何活跃四大组件，纯粹作为下一次冷启动缓存外壳。

### 2. 为什么黑科技“保活”已死？合规替代怎么答？
早期常见的 1 像素 Activity、双进程互相拉起、无声音乐播放等在 Android 8.0–15 后台限制、电池白名单与厂商冻结机制（App Standby Buckets）及应用商店隐私审查下已彻底失效甚至被下架。合规做法：
- **实时消息送达**：接入**厂商系统推送通道**（小米/华为/OPPO/vivo/Honor + FCM）；
- **可靠延时/周期任务**：交给 **`WorkManager`**；
- **用户可感知的连续任务**（导航、音频、运动记录、蓝牙设备长连）：申请对应类型的**合法前台服务**并展示常驻通知。

## 图解流程

| 进程级别 | 典型组件状态 | `oom_score_adj` 趋势 | 被 LMKD 查杀风险 |
| :--- | :--- | :---: | :---: |
| **1. Foreground** | 前台 `RESUMED` Activity / 前台服务 | 最低（`0` 附近） | 极低（除非内存崩溃） |
| **2. Visible** | 被透明窗口遮挡但可见的 `PAUSED` Activity | 低（`100` 附近） | 较低 |
| **3. Service** | 运行中普通后台服务 | 中（`500`–`800`） | 较高（运行超 30 分钟还会进一步降权） |
| **4. Cached / Empty** | 退后台无活跃服务或空壳进程 | 最高（`900+`） | **极高（优先牺牲以腾出内存）** |

## 高频追问与关键词

- **追问 1**：Zygote 为什么能极大加速应用冷启动？
  - 关键词：**预加载 + Copy-on-Write（写时复制）**；Zygote 早已加载完几千个高频 Android Framework 类与公共资源并初始化 ART，应用进程 `fork()` 瞬间只复制页表指针指向相同物理页，只有当某进程真正修改数据时内核才分配独立物理页。
- **追问 2**：在现代 Android 中，`onTrimMemory(level)` 回调有什么工程价值？
  - 关键词：系统在内存吃紧或 App 进入后台（`TRIM_MEMORY_UI_HIDDEN` / `TRIM_MEMORY_BACKGROUND` / `TRIM_MEMORY_RUNNING_CRITICAL`）时主动通知回调，App 可据此提前清空 Glide 内存缓存或大对象池，降低 `oom_score_adj` 吃紧被 LMKD 杀死的几率。

## 延伸参考

参考 Android 官方进程生命周期说明与 AOSP `lmkd` 内存查杀策略文档。
