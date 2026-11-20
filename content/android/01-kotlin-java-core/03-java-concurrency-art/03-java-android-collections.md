---
id: android.java-android-collections
aliases: []
title: HashMap（1.8 红黑树）、ConcurrentHashMap 与 SparseArray/ArrayMap 对比
summary: 掌握 HashMap 1.8 扰动哈希与红黑树演进、ConcurrentHashMap 并发锁优化，以及 Android 专为省内存设计的 SparseArray 与 ArrayMap。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 6
status: published
keywords:
  - HashMap 树化 8/6
  - ConcurrentHashMap CAS+synchronized
  - SparseArray 免装箱
  - ArrayMap 双数组二分
  - 内存与时间权衡
references:
  - title: Android Developers - SparseArray
    url: https://developer.android.com/reference/android/util/SparseArray
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - ArrayMap
    url: https://developer.android.com/reference/android/util/ArrayMap
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **`HashMap`（JDK 1.8）**：采用**数组 + 链表 + 红黑树**；通过 `(h ^ (h >>> 16))` 扰动让高 16 位参与寻址降低冲突；当桶链长度达到 **8** 且数组容量达到 **64** 时树化防碰撞退化为 O(n)，退化到 **6** 时还原链表防抖动。
- **`ConcurrentHashMap`（1.8）**：摒弃 1.7 分段 `Segment` 锁，改为 **`CAS` 无锁初始化/插入 + 对桶头节点 `synchronized` 细粒度加锁**，大幅提高并发度并省内存。
- **Android 专属容器**：在**数据量千级以内**的移动端场景下，优先用 `SparseArray<V>`（`int` 键避免 `Integer` 自动装箱）和 `ArrayMap<K, V>`（双数组结构省去大量 `Node` 包装对象，用 `O(logN)` 二分查找换内存节省）。

## 核心原理解析

### 1. `HashMap` 为什么容量必须是 2 的幂 & 为什么 1.8 改尾插？
- **2 的幂位运算**：`(n - 1) & hash` 等价于取模但速度极快，且扩容两倍后节点新位置要么原索引要么 `原索引 + 旧容量`，无需重新算哈希；
- **尾插防成环**：1.7 并发扩容头插法在多线程下极易逆序产生死循环链表（CPU 100%），1.8 改为尾插保持顺序但仍不保证线程安全（并发需用 `ConcurrentHashMap`）。

### 2. `SparseArray` 与 `ArrayMap` 的取舍边界
- **`SparseArray` 系列**（`SparseIntArray`/`LongSparseArray`）：内部维护一个递增 `int[] mKeys` 和 `Object[] mValues`，直接省去 `Integer` 装箱对象和 `HashMap.Node` 对象（每个 Node 在 64 位设备上额外耗几十字节），并且内部支持延迟删除标志 `DELETED` 复用槽位。
- **`ArrayMap`**：内部用 `int[] mHashes` 存排序后哈希码，用 `Object[] mArray` 按 `[key0, val0, key1, val1]` 紧凑交错存放（Android `Bundle` 底层即使用 `ArrayMap`）；提供缓存池复用空数组。
- **不适用场景**：当键值对超过 **1000+ 且频繁随机插入删除** 时，数组二分查找及 `System.arraycopy` 搬移成本反超 `HashMap` 的 O(1)，此时应换回 `HashMap`。

## 图解流程

| 容器类型 | 底层结构 | 键类型与装箱 | 线程安全机制 | 查找复杂度 | Android 适用场景 |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **`HashMap` (1.8)** | 数组 + 链表 + 红黑树 | 任意引用（基本类型需装箱） | 非安全 | 均摊 `O(1)` | 大数据量（>1000）、高频增删查 |
| **`ConcurrentHashMap`** | 数组 + 链表/红黑树 | 非 null 键值 | **CAS + 桶头 `synchronized`** | 均摊 `O(1)` | 高并发缓存、多线程共享索引 |
| **`SparseArray`** | 有序 `int[]` + `Object[]` | **原生 `int`（零装箱）** | 非安全 | 二分 `O(logN)` | `<1000` 规模、整型 ID 映射 View/条目 |
| **`ArrayMap`** | 有序 `mHashes[]` + 交错 `mArray[]` | 泛型对象 | 非安全 | 二分 `O(logN)` | `<1000` 规模、Intent/Bundle 传参载体 |

## 高频追问与关键词

- **追问 1**：为什么 `HashMap` 树化阈值定在 8，退化定在 6？
  - 关键词：哈希分布遵循泊松分布（链表长度到达 8 的概率不足千万分之一），只在极端碰撞才树化；设 6 作为缓冲滞回区间避免在 7↔8 边界反复插删引发频繁树化/链表化震荡。
- **追问 2**：`ConcurrentHashMap` 的 `size()` 是精确值还是近似值？为什么不能放 `null` 键值？
  - 关键词：1.8 通过 `baseCount + CounterCell[]` 分段累计（类似 `LongAdder`），高并发读取呈现弱一致近似值；禁止 `null` 是为了消除 `get(key) == null` 时“键不存在”与“值为 null”在并发下的二义性（无法安全靠 `containsKey` 事后二次校验）。

## 延伸参考

对照 Android 官方 `SparseArray` 与 `ArrayMap` 性能指引，识别内存敏感列表中的轻量容器替换点。
