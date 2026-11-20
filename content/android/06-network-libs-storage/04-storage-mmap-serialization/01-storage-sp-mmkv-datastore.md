---
id: android.storage-sp-mmkv-datastore
aliases: []
title: SharedPreferences 缺陷（全量 XML / UI fsync ANR）与 DataStore/MMKV 对比
summary: 剖析 SharedPreferences 引发主线程 ANR 和多进程不安全的源码原因，对比 Jetpack DataStore（Preferences/Proto）与腾讯 MMKV 的存储原理及选型边界。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 6
status: published
keywords:
  - SP 全量 XML 解析与 fsync
  - QueuedWork.waitToFinish ANR
  - DataStore 协程原子化
  - MMKV mmap + Protobuf
  - 跨进程并发安全对比
references:
  - title: Android Developers - Jetpack DataStore
    url: https://developer.android.com/topic/libraries/architecture/datastore
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Save key-value data
    url: https://developer.android.com/training/data-storage/shared-preferences
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **为什么面试必考“淘汰 `SharedPreferences`”？**——SP 存在四大硬伤：
  1. **首次加载全量阻塞**：`getSharedPreferences()` 首次异步读取并解析**整份 XML 文件**放进内存静态 Map 缓存，紧接着调用 `getString()` 会强制阻塞等待加载完毕引起首帧卡顿；
  2. **内存常驻不释放**：读过的整份 XML 永久缓存一份完整副本在内存中不卸载；
  3. **`apply()` 照样引发隐形 ANR（经典高频考点）**：很多人以为 `commit()` 才同步落盘而 `apply()` 异步很安全——大错特错！`apply()` 虽把异步写盘任务丢进 **`QueuedWork`** 队列立刻返回，但当页面退后台触发 **`Activity.onStop()` / `Service.onStopCommand()`** 时，系统源码 `ActivityThread.handleStopActivity()` 会强行调用 **`QueuedWork.waitToFinish()` 死等全部未落盘的 SP 全部 `fsync` 完**，极易在主线程卡超 5–10 秒引爆线上 ANR！
  4. **不支持跨进程安全**：`MODE_MULTI_PROCESS` 早已废弃不可靠，多进程同时读写会整份覆盖丢数据。
- **两大主流替代选型**：
  - **`Jetpack DataStore`**：Google 官方替代，基于 **Kotlin 协程 + Flow** 全程非阻塞异步、`Preferences/Proto` 事务级**原子替换文件写**（崩溃也不写半截损坏），支持单进程安全与结合文件锁的多进程 `MultiProcessDataStore`；
  - **`MMKV`（微信开源）**：基于 Linux **`mmap` 内存映射 + Protobuf 增量追加写**，同步接口极快（读写几乎等同直接读写内存，由 OS 自主异步回写磁盘），原生内置进程锁与 CRC 校验支持高性能多进程共享（极端断电丢末尾几字节概率微弱但足够常规配置使用）。

## 核心原理解析

### 1. SP 中 `commit()` 与 `apply()` 的源码细节差异
- **`commit()`**：在调用线程同步执行文件写盘（`fsync`）并回传布尔成功结果；
- **`apply()`**：先同步立刻改写内存 `Map` 缓存（所以同一进程马上 `get` 能读到新值），再把落盘任务 `awaitCommit` 塞进全局 **`QueuedWork`** 交由单一后台 `HandlerThread` 异步写；每次改一个字段都会把整份全量 XML 重新序列化重写一遍覆盖磁盘文件，效率极低。

### 2. DataStore 与 MMKV 如何从根源解决痛点？
- **`DataStore`**：使用 `FileOutputStream` 写临时文件并重命名覆盖（保证事务一致性），完全借助 **`Flow`** 推送数据流且彻底把 I/O 隔离在 `Dispatchers.IO` 协程内，不挂载在 `QueuedWork` 上，**绝不会阻塞 `onStop` 引发 ANR**；`Proto DataStore` 进一步带来强类型模型与编译期字段校验。
- **`MMKV`**：不再每次重写全量文件，而是利用 `mmap` 直接向末尾增量追加 `key-value` 对（空间写满时触发重整排重），即使 App 在写操作刚完成的一微秒瞬间闪退，数据早已进入内核共享 Page Cache 由操作系统负责安全刷盘，同时省去 XML 解析开销，读写速度比 SP 快出几十倍！

## 图解流程

| 维度 | `SharedPreferences` | `Jetpack DataStore` | 微信 `MMKV` |
| :--- | :--- | :--- | :--- |
| **底层格式与写入方式** | 全量 XML（每次修改重写整份） | Protobuf / Preferences（临时文件原子替换） | **`mmap` + Protobuf 增量追加写** |
| **主线程卡顿 / ANR 风险** | **极高**（初始化锁 + `QueuedWork.waitToFinish` 阻塞 `onStop`） | **极低**（纯协程异步 `Flow`，无 `QueuedWork` 钩子） | **极低**（内存级读写，OS 异步刷盘，无 XML 解析） |
| **跨进程安全** | **不支持**（易相互覆写破坏） | 支持（`MultiProcessDataStore` 基于文件锁） | **原生强支持**（C++ 层跨进程文件锁 + CRC 校验） |
| **强类型与异常安全** | 无类型校验，异常易损坏 | **强类型 (`Proto`) + 事务原子性极强** | 键名键值存取；极端断电存在极微概率末尾写残（靠 CRC 容错） |

## 高频追问与关键词

- **追问 1**：如果老项目历史代码大量依赖 `SharedPreferences` 且不敢一次性大改架构，怎么低成本安全过渡？
  - 关键词：一方面利用 **`MMKV` 实现了 `SharedPreferences` 接口** 可以无缝几行切换接管并附带 `importFromSharedPreferences()` 无痛迁移老数据；另一方面在 Android 8.0+ 过渡期也可做轻量封装合并高频小提交、控制单个 SP 文件极小化拆分隔离，防止单一巨无霸 SP 拖死 `onStop`。
- **追问 2**：`DataStore` 如果实在有极少数老同步代码必须立等拿到值，怎么处理？
  - 关键词：官方推荐尽早预加载或改造为 `Flow` 响应式观察；极少数兼容处（非启动高频热点）才考虑在确认无主线程死锁前提下谨慎取 `first()` 并加内存缓存。

## 延伸参考

参考 Android Developers `DataStore` 官方指南与 `SharedPreferences` 文档对比异步事务机制。
