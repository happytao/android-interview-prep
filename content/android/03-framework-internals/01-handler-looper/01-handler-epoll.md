---
id: android.handler-epoll
aliases:
  - handler-mechanism
title: Handler、Looper、MessageQueue 协作与 Linux pipe/eventfd + epoll 休眠唤醒
summary: 拆解主线程消息队列的按时间序单链表调度、ThreadLocal 线程隔离，以及通过 Linux pipe（6.0 前）与 eventfd（6.0+）配合 epoll 实现精准休眠唤醒的机制。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 7
status: published
keywords:
  - MessageQueue 时间序单链表
  - nativePollOnce / nativeWake
  - pipe 与 eventfd 演进
  - epoll_wait
  - Message.obtain() 享元池
diagram: HandlerLooperSvg
references:
  - title: Android Developers - Processes and threads
    url: https://developer.android.com/guide/components/processes-and-threads
    type: official
    verifiedAt: "2026-11-20"
  - title: Gityuan - Android 消息机制 Handler 源码解析
    url: https://gityuan.com/2015/12/26/handler-message-framework/
    type: blog
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **一句话概览**：Android 是彻底的事件驱动系统——`Handler` 负责发消息与处理消息，`MessageQueue` 是按执行时间排序的底层单链表队列，`Looper` 作为永动泵不断取消息投递；每个线程通过 `ThreadLocal` 唯一绑定一个 `Looper`。
- **最关键底层原理（休眠唤醒）**：`MessageQueue.next()` 在无消息或队头延时未到时，通过 JNI 调用 `nativePollOnce()` 陷入 Linux 内核 **`epoll_wait`** 阻塞休眠（让出 CPU）；当工作线程 `enqueueMessage()` 插入新头节点时调用 `nativeWake()` 写入描述符唤醒主线程（Android 6.0 之前用 `pipe` 双端管道，6.0 起改用更省内存描述符的 **`eventfd`**）。
- **性能优化点**：切勿频繁 `new Message()`，使用 `Message.obtain()` 从最大容量 50 的全局同步单链表对象池复用，避免 UI 帧间隙产生 GC 抖动。

## 核心原理解析

### 1. 四大核心角色分工
- **`Looper`**：构造时创建唯一 `MessageQueue` 并借助 **`ThreadLocal`** 存入当前线程；调用 `Looper.loop()` 无限循环消费消息（主线程在 `ActivityThread.main()` 已自动完成 `prepareMainLooper()` 和 `loop()`）。
- **`MessageQueue`**：数据结构并非传统 FIFO 队列，而是按 `Message.when`（`SystemClock.uptimeMillis() + delay`）从小到大排序的**单向链表**，方便快速插入延时消息和优先检索到期节点。
- **`Handler`**：创建时绑定当前线程 `Looper` 与 `MessageQueue`；发送消息时自动把 `msg.target` 指向自己；消费时经 `msg.target.dispatchMessage()` 依次检查 `msg.callback`（`Runnable`）→ `Handler.mCallback` → 子类重写 `handleMessage()`。

### 2. Linux `epoll` 与 `pipe` → `eventfd` 机制
- `NativeMessageQueue` 内部创建 `Looper`（C++ 层）并实例化一个 `epoll` 实例监听唤醒描述符与输入事件（`InputChannel` 等）FD；
- 当下个消息还要等 `nextPollTimeoutMillis` 毫秒（若队列空则传 `-1` 无限等待），Java 层调用 `nativePollOnce(ptr, timeout)` 进入 `epoll_wait`；**此时线程真正进入内核态阻塞挂起，不消耗任何 CPU 资源**；
- 一旦异步线程插入队头消息或定时时间到，`nativeWake()` 向 **`eventfd`**（Android 6.0+ 单一 8 字节内核计数器，替代早期占两个 FD 的 `pipe` 管道）写入 `1`，`epoll_wait` 立即返回并把消息递交给 Java 层分发。

## 图解流程

:::diagram HandlerLooperSvg
:::

## 高频追问与关键词

- **追问 1**：子线程中能直接 `new Handler()` 吗？怎么正确在子线程使用 Handler？
  - 关键词：直接创建会抛 `Can't create handler inside thread that has not called Looper.prepare()`；需先调 `Looper.prepare()` 再 `Looper.loop()`，退出时手动 `quitSafely()`；更便捷可用自带 Looper 管理的 **`HandlerThread`**。
- **追问 2**：`Message.obtain()` 对象池为什么上限是 50，且跨线程回收安全吗？
  - 关键词：内部通过静态 `sPoolSync` 锁维护链表头 `sPool`（最大 `MAX_POOL_SIZE = 50`），足够应付常态单帧消息且不占用过多常驻堆内存。
- **追问 3**：`postDelayed(runnable, 1000)` 一定能精确在 1000ms 后执行吗？为什么？
  - 关键词：不一定。一方面使用基于开机不含深度休眠时间的 **`SystemClock.uptimeMillis()`**（灭屏休眠期暂停计时）；另一方面若主线程前一个任务耗时过长，后续消息只能顺延排队等待。

## 延伸参考

对照 Android 官方 Processes and Threads 文档与 Gityuan Handler 源码分析梳理 Java/Native 跨层调用细节。
