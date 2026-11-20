---
id: android.recyclerview-diffutil-prefetch
aliases: []
title: RecyclerView 局部刷新（DiffUtil + Payload）、预取与卡顿优化
summary: 掌握 DiffUtil Myers 差分算法结合 Payload 避免图片闪烁的局部刷新姿势，及 GapWorker 帧间隙预取与 RecyclerView 全套性能调优清单。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - DiffUtil + Payload
  - AsyncListDiffer / ListAdapter
  - GapWorker Prefetch 预取
  - setHasFixedSize(true)
  - 共享 RecycledViewPool
references:
  - title: Android Developers - ListAdapter & DiffUtil
    url: https://developer.android.com/reference/androidx/recyclerview/widget/ListAdapter
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - RecyclerView Performance (Prefetch)
    url: https://developer.android.com/develop/ui/views/layout/recyclerview-custom#optimize
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **局部刷新核心（告别 `notifyDataSetChanged`）**：直接调 `notifyDataSetChanged()` 会清空全部缓存、强制重绑全屏所有 Item 且失去增删动画；工程标准是使用 **`ListAdapter`（内置 `AsyncListDiffer`）+ `DiffUtil.ItemCallback`**，在后台线程用 Myers 差分算法算出增量变动，并通过 **`getChangePayload()`** 传增量字段（如只刷新点赞数和图标状态，**避免整张大图闪烁重载**）。
- **帧间隙预取原理（`GapWorker`）**：UI 线程绘制完当前帧提交给 `RenderThread` 后，到下一次 VSync 之间通常还有几毫秒空闲间隙；`GapWorker` 利用这段闲置提前把即将滑入屏幕的下一个 ViewHolder 创建并绑定好，把单帧尖峰耗时摊平到多帧。
- **高频综合优化清单**：固定宽高启用 `setHasFixedSize(true)`、禁止嵌套 `RecyclerView` 直接用 `ConcatAdapter` 或共享 `RecycledViewPool`、在 `onCreateViewHolder` 绑定点击事件而非每次 `onBind` 反复 `new Listener`。

## 核心原理解析

### 1. `DiffUtil` 两步比对与 `Payload` 局部更新防闪烁
1. **`areItemsTheSame(oldItem, newItem)`**：先比较唯一主键 ID（判断是不是同一个对象，决定是否走移动/插入/删除动画）；
2. **`areContentsTheSame(oldItem, newItem)`**：主键相同再比较内容字段（用 Kotlin `data class` 的 `==`）；
3. **`getChangePayload(oldItem, newItem)`**：当 `areItemsTheSame == true` 且 `areContentsTheSame == false` 时回调，返回仅含变动字段的小标记或 `Bundle`；绑定阶段走**三个参数的 `onBindViewHolder(holder, position, payloads)`**，当 `payloads.isNotEmpty()` 时只刷新对应点赞 TextView 而不去动 `Glide.load()` 大图，彻底杜绝列表闪烁。

### 2. 为什么局部刷新还要关注 `DefaultItemAnimator`？
即便用了 `notifyItemChanged(pos)`，默认的 `DefaultItemAnimator` 在没有传 `payload` 时会执行“旧 Holder 淡出 + 新 Holder 淡入（`supportsChangeAnimations = true`）”的双 Holder 交叉动画，肉眼一样感觉闪一下；除了加 `Payload` 外，也可按需关闭改变动画 `(itemAnimator as? SimpleItemAnimator)?.supportsChangeAnimations = false`。

## 图解流程

| 优化措施 | 解决的核心卡顿 / 体验痛点 | 关键前提 / 注意事项 |
| :--- | :--- | :--- |
| **`ListAdapter` + `DiffUtil`** | 替代 `notifyDataSetChanged()` 全量重绘 | 传入新列表必须保证是新集合实例/深不可变拷贝，勿原集合 `add` 后直接提交 |
| **带 `Payload` 三参 `onBind`** | 点赞/倒计时局部刷新导致**大图闪烁** | 判断 `payloads.isEmpty()` 兜底全量绑定（首次加载仍走全量） |
| **`GapWorker` Prefetch** | 滑入新复杂条目瞬间掉帧 | `LinearLayoutManager.initialPrefetchItemCount` 对嵌套横向列表尤其重要 |
| **`setHasFixedSize(true)`** | 条目增删导致外层整个 `RecyclerView` 重走 `requestLayout` | 仅当 `RecyclerView` 自身宽高不受内容条数动态撑大时才能开启 |
| **共享 `RecycledViewPool`** | `ViewPager2` / 嵌套横向子列表重复 inflate 相同卡片 | 配合 `pool.setMaxRecycledViews(type, count)` 适当增大池容量 |

## 高频追问与关键词

- **追问 1**：为什么调用 `ListAdapter.submitList(list)` 有时界面完全不刷新？
  - 关键词：直接复用了同一个 `MutableList` 对象只修改了内部元素就提交，`AsyncListDiffer` 开头判断 `if (newList === mList) return` 直接短路返回！必须提交 **`list.toList()` 新不可变列表副本**（且 Item 对象本身也要不可变 `data class` copy，否则新旧比对引用同一对象永远相等）。
- **追问 2**：`RecyclerView` 数据滑动过快时出现图片错位或残留怎么根治？
  - 关键词：① 在 `onBindViewHolder` 所有 `if-else` 分支都显式完整设置视图可见性/背景，绝不偷懒只写 `if`；② 配合 Glide 等与宿主的生命周期绑定自动清除占位与取消过期请求。

## 延伸参考

参考 Android 官方 `ListAdapter` 与 RecyclerView 性能调优专题。
