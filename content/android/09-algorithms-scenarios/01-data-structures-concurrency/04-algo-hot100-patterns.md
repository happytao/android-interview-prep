---
id: android.algo-hot100-patterns
aliases:
  - algo-hot100
title: 常用数据结构复杂度选型与客户端高频手撕算法模式（Hot100 核心子集）
summary: 系统梳理数组、链表、哈希表、栈队列、堆、二叉树与前缀树在客户端业务中的复杂度选型，并提炼双指针、滑动窗口、单调栈、二叉树递归与经典动态规划核心模板。
priority: bonus
difficulty: medium
frequency: 4
estimatedMinutes: 7
status: published
keywords:
  - 数据结构复杂度与移动端容器选型
  - 双指针与滑动窗口
  - 单调栈与优先级队列 Top-K
  - 二叉树递归三要素
  - 一维/二维动态规划状态转移
references:
  - title: Kotlin Docs - Collections overview
    url: https://kotlinlang.org/docs/collections-overview.html
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - SparseArray API Reference
    url: https://developer.android.com/reference/android/util/SparseArray
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **数据结构面试的双维度考察**：中级 Android 面试既考通用 LeetCode Hot100 题型，也考“**为什么 Android 里在合适场景用 `SparseArray`/`ArrayMap`/`ArrayDeque` 替换常规 JDK 容器**”：
  - 通用数据结构按**“随机访问 vs 增删 vs 最值维护 vs 范围前缀匹配”**选型；
  - 移动端需额外警惕 **Auto-boxing 装箱内存分配与 HashMap 默认数组槽位浪费**（千级以内小表首选 `SparseArray` / `ArrayMap`）。
- **手撕算法 5 大高频模式直觉反应（见到题干关键字立即匹配模板）**：
  1. **有序数组/回文/三数之和/去重** → **双指针**（相向收缩或快慢分离）；
  2. **最长无重复/最小覆盖子串/连续子数组定长或最值** → **滑动窗口**（右扩进窗、左缩出窗维护频次哈希表）；
  3. **下一个更大元素/每日温度/直方图接雨水** → **单调栈**；**Top-K / 合并 K 个链表** → **堆（`PriorityQueue`）**；
  4. **树深度/路径和/翻转/最近公共祖先/层次遍历** → **DFS 递归（明确返回值+终止条件+单层逻辑）或 BFS 队列**；
  5. **爬楼梯/打家劫舍/零钱兑换/最长递增子序列/编辑距离** → **动态规划（定义 `dp[i]` 状态含义 + 转移方程 + Base Case 初始化）**。

## 核心原理解析

### 1. Android 特有容器与标准 JDK 容器性能权衡
- **`SparseArray` / `SparseIntArray`**：键为原始 `int` 数组有序存储 + 二分查找（$O(\log N)$），值存连续数组，彻底省去 `HashMap<Integer, E>` 每次装箱生成 `Integer` 对象以及 `Entry` 包装对象的开销；千条数据内综合 CPU+GC 明显占优，超过万条写入退化（数组 `arraycopy` 挪动开销变大）。
- **`ArrayMap`**：用 `int[] hashes` + `Object[] array` 双数组替代 `Entry` 链表，哈希冲突通过线性探测邻近定位，内存占用远低于 `HashMap`，正是 `Bundle` 底层存储的核心容器（同样只推荐小数据量场景）。
- **`ArrayDeque`**：底层循环数组 + 头尾双指针位运算扩容，作栈或队列均无 `LinkedList` 的节点内存分配与指针缓存不友好问题。

### 2. 五大算法核心模板不变量
- **滑动窗口**：外层 `right` 步进纳入窗口统计，内层 `while (窗口条件不满足或需要求最小覆盖)` 时 `left++` 收缩并实时更新最优解，每个元素最多进出窗口各 1 次，严格保证 **$O(N)$**；
- **单调栈**：栈内保存的是**下标（而非数值）**并保持对应值严格单调递增或递减，一旦新元素破坏单调性即循环 `pop()`，此时“破坏者”就是刚弹出元素的右边界，栈内新栈顶就是左边界；
- **动态规划（DP）与状态压缩**：先写出完整二维 `dp[i][j]` 保证不重不漏（背包问题外层遍历物品/内层倒序遍历容量防止同一物品在 `0-1 背包` 里被重复累加，完全背包则正序），再通过滚动数组把空间复杂度降到 $O(V)$。

## 图解流程

| 数据结构 | 随机访问 | 头/尾/中间增删 | 典型客户端应用与高频对应题 |
| :--- | :--- | :--- | :--- |
| **动态数组 (`ArrayList`/`ArrayDeque`)** | $O(1)$ | 尾摊还 $O(1)$ / 中间 $O(N)$ | `Adapter` 列表数据源、双端队列替代 `Stack` |
| **双向链表 (`LinkedList`)** | $O(N)$ | 已知节点 $O(1)$ | 配合 HashMap 手写 **LRU Cache**、反转/判环 |
| **哈希表 (`HashMap`/`LinkedHashMap`)** | 平均 $O(1)$ | 平均 $O(1)$ | `O(1)` 查重计数、滑动窗口频次统计、两数之和 |
| **移动端稀疏表 (`SparseArray`/`ArrayMap`)** | 查键 $O(\log N)$ | 小规模快 / 大规模 $O(N)$ | View 标签缓存、`Bundle` 小规模 KV（<1000 键免装箱） |
| **堆 / 优先队列 (`PriorityQueue`)** | 堆顶 $O(1)$ | 插入/弹出 $O(\log K)$ | **Top-K 高频词/耗时**、合并 K 个有序消息流 |
| **单调栈 (`ArrayDeque`)** | 仅栈顶 $O(1)$ | 均摊 $O(1)$ | 柱状图最大矩形、每日温度、下一个更大元素 |
| **前缀树 (`Trie`)** | 按字符长度 $O(L)$ | 插入/查前缀 $O(L)$ | 本地搜索框拼音/关键词前缀联想提示（AutoComplete） |

## 高频追问与关键词

- **追问 1**：`0-1 背包`压缩成一维滚动数组时，为什么内层容量循环必须“从大到小倒序”而完全背包要“正序”？
  - 关键词：**防止状态覆盖复用**；二维转移时 `dp[i][w]` 依赖上一行的 `dp[i-1][w - weight]`。一维数组从后往前更新能保证当前轮读到的较小容量状态仍是“上一行未放入当前物品”的旧值（每个物品只用 1 次）；若从前往后更新，较小容量已被当前物品更新过，后续容量继续依赖它就等效于允许当前物品被放入多次（即完全背包）。
- **追问 2**：什么场景下绝对不要用 `ArrayMap` 替代 `HashMap`？
  - 关键词：**数据量大于千级（如 > 1000 条）或需要频繁随机插入/删除且追求极致低延迟**的场景；`ArrayMap` 查找是 $O(\log N)$ 二分，插入删除需在连续内存中 `System.arraycopy` 整体挪动元素，数据量大时拷贝成本会迅速反超哈希表。

## 延伸参考

参考 Kotlin Collections 概览与 Android `SparseArray` 官方文档。
