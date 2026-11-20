---
id: android.serialization-parcelable-json
aliases: []
title: 序列化选型对比（Serializable vs Parcelable、Gson vs Moshi/kotlinx.serialization）
summary: 对比 Android 两大内存/磁盘对象序列化接口差异，并深入分析反射型 JSON 库（Gson）在 Kotlin 空安全与默认值场景下的陷阱及现代编译期无反射替代方案。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - Serializable 反射与 I/O
  - Parcelable 内存直写 Parcel
  - kotlin-parcelize 编译生成
  - Gson 破坏 Kotlin 非空默认值
  - Moshi / kotlinx.serialization
references:
  - title: Android Developers - Parcelable and Bundles
    url: https://developer.android.com/guide/components/activities/parcelables-and-bundles
    type: official
    verifiedAt: "2026-11-20"
  - title: Kotlin 官方文档 - Kotlin Serialization
    url: https://kotlinlang.org/docs/serialization.html
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **`Serializable` vs `Parcelable`（对象传参分水岭）**：
  - **`Serializable`**：Java 标准序列化接口，实现最简单但底层大量依赖**反射解析类结构并产生大量临时 GC 对象**，速度慢且耗电，仅适合**需要把对象完整持久存到磁盘或网络透传**；
  - **`Parcelable`**：Android 专为 Binder 跨进程内存传递设计，直接在 **`Parcel` 共享内存块里按固定顺序读写基础字节流，零反射几乎无临时对象**，配合 Kotlin **`@Parcelize`** 插件编译期自动生成模板代码，内存级传递（`Intent`/`Bundle`/AIDL）务必首选 `Parcelable`！
- **JSON 库选型与 Kotlin 致命陷阱（必考实战经验）**：
  - 老牌 **`Gson`** 底层基于 Java `Unsafe.allocateInstance()` 反射**直接绕过 Kotlin 构造函数**，导致 Kotlin 类里写的**非空字段（`val name: String`）碰到后台漏传字段时居然被强行塞入 `null`（直到使用时才抛 NPE），且**构造器写的默认参数 `val age: Int = 18` 全部失效变成 `0`！**
  - 现代 Kotlin 工程强烈推荐 **`kotlinx.serialization`**（纯编译期生成序列化器，**零反射**、全面尊重 Kotlin 默认值与空安全、支持 JSON/Protobuf 且跨 KMP）或 **`Moshi`**（支持 KSP 代码生成适配器，完美尊重空安全与默认值）。

## 核心原理解析

### 1. `Serializable` 的潜在陷阱（`serialVersionUID` 与构造器）
- 若不显式指定 `private static final long serialVersionUID`，Java 编译器会根据类字段与方法自动算一个哈希值；后续只要给类增删一个普通辅助方法，反序列化老磁盘文件时就会抛出 `InvalidClassException`；
- 反序列化过程**不会调用类自身的构造函数**（直接由流恢复底层内存字节状态）。

### 2. 为什么不能把 `Parcelable` 序列化后的二进制数据持久化存进本地文件？
官方文档明确警告：**绝对不要用 `Parcel.marshall()` 把 `Parcelable` 持久化保存到本地硬盘！** 因为 `Parcel` 底层内存对齐格式会随着不同 Android 系统版本、CPU 架构（32/64 位）甚至 OEM 固件更新而改变，系统一升级旧版本存的文件直接读崩！持久化结构化对象请用 JSON、Protobuf 或 Room。

## 图解流程

| 维度 | `Serializable` | `Parcelable` (`@Parcelize`) | `Gson` | `Moshi (KSP)` / `kotlinx.serialization` |
| :--- | :--- | :--- | :--- | :--- |
| **底层机制** | Java 运行时反射 + 流读写 | 编译期生成直写 `Parcel` 内存 | 运行时反射 + `Unsafe` 绕过构造 | **编译期 KSP/插件生成零反射适配器** |
| **Kotlin 空安全/默认值** | 绕过构造器（有陷阱） | **完全遵从构造规范** | **严重破坏（非空可被塞 null，默认值变 0）** | **原生完美尊重非空校验与默认值** |
| **R8 混淆敏感度** | 高（需严格 `keep` 字段名与 UID） | 低（生成静态 `CREATOR` 明确调用） | 高（反射依赖字段原名或 `@SerializedName`） | 低（仅在边界配置 `@Serializable` 生成代码） |
| **最佳使用场景** | 仅老 Java 序列化磁盘兜底 | **`Intent` / `Bundle` / AIDL 内存传递** | 老 Java 遗留项目兼容 | **现代 Kotlin 网络 JSON / Protobuf 解析首选** |

## 高频追问与关键词

- **追问 1**：为什么用了 `@Parcelize` 注解还是要注意嵌套对象也要实现 `Parcelable`？遇到不支持的类型怎么办？
  - 关键词：因为 `@Parcelize` 编译器插件在生成 `writeToParcel` 时需要每个成员属性本身也是基础类型、`String`、`Parcelable` 或 `Serializable`；对于 `Date`/`BigDecimal` 等特殊外部类型，可通过自定义 **`@TypeParceler<T, MyParceler>`** 扩展支持。
- **追问 2**：Protobuf 相比 JSON 在移动端接口通信有哪些取舍？
  - 关键词：**优点**：二进制编码体积小约 30%–70%（省弱网流量）且解析比 JSON 快数倍、强 Schema 契约；**缺点**：不具备人类直接可读性（抓包调试需挂载 `.proto` 解析插件）、字段演进必须严格遵守编号只增不复用规则。

## 延伸参考

参考 Android Developers `Parcelable and Bundles` 指南与 Kotlin 官方 `kotlinx.serialization` 文档。
