---
id: android.java-generics-apt-ksp
aliases: []
title: Java/Kotlin 泛型擦除（in/out 型变）、反射开销与 APT/KSP 注解处理原理
summary: 理解 JVM 泛型擦除与桥接方法、声明处型变 out/in 原则，以及注解处理从运行时反射到编译期 APT/KSP 的性能演进。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - 泛型擦除
  - out 协变 / in 逆变
  - 桥接方法
  - 运行时反射开销
  - APT vs KSP
references:
  - title: Kotlin 官方文档 - Generics in, out, where
    url: https://kotlinlang.org/docs/generics.html
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Migrate from kapt to KSP
    url: https://developer.android.com/build/migrate-to-ksp
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **泛型本质**：Java 与 Kotlin 在 JVM 字节码层均采用**伪泛型（类型擦除）**，仅在编译期检查类型并在多态重写时生成桥接方法（Bridge Method）；通过 `TypeToken` 匿名子类或内联 `reified` 可在运行时/调用点保留泛型实参。
- **型变口诀**：**生产者用 `out`（协变，只读），消费者用 `in`（逆变，只写）**，对应 Java 的 `? extends T` 与 `? super T`。
- **注解方案演进**：运行期反射（`Class.getDeclaredMethod`）慢且易被混淆破坏 → **APT/KAPT**（生成 Java 存根，编译慢） → **KSP**（直接解析 Kotlin AST/符号，编译提速约 2 倍）。

## 核心原理解析

### 1. 泛型擦除与保留实参的两种手段
泛型信息 `List<String>` 在编译后会擦除为裸类型 `List`（上界默认为 `Object`/`Any?`）：
- **类签名保留**：父类的泛型参数元数据会写进字节码 `Signature` 属性中，因此 Gson/Moshi 利用 **`object : TypeToken<List<User>>() {}`** 创建匿名子类，在运行时通过 `getGenericSuperclass()` 反射提取真实类型；
- **内联调用点保留**：Kotlin `inline fun <reified T>` 在编译展开时把真实类字节码直接填进调用点。

### 2. 型变（Variance）：`out` 与 `in`
- **`out T`（协变）**：保留子类型关系（`Producer<Dog>` 是 `Producer<Animal>` 的子类型），限制 `T` 只能作为返回值输出（安全读取），防止外部往 `MutableList<Dog>` 里塞一只 `Cat`。
- **`in T`（逆变）**：反转子类型关系（`Comparable<Any>` 可当作 `Comparable<String>` 使用），限制 `T` 只能作为入参消费。

### 3. 反射开销与 APT / KSP 对比
- **运行时反射**：跳过编译期静态优化、触发动态方法查找与安全校验、增加内存分配，且必须靠 `@Keep` 避开 R8 混淆；
- **KAPT vs KSP**：Room / Hilt / Moshi 等早期依赖 Javac 注解处理器（APT），Kotlin 代码必须额外生成 Java Stub（存根）供 KAPT 解析，拖慢增量编译；**KSP（Kotlin Symbol Processing）** 原生对接 Kotlin 编译器前端符号，无需生成 Java 存根即可产出代码，编译速度显著提升且原生理解 Kotlin 空安全语义。

## 图解流程

| 维度 | 运行时反射 (`Reflection`) | `KAPT` (Java APT 适配) | `KSP` (Kotlin 原生处理) |
| :--- | :--- | :--- | :--- |
| **执行时机** | App 运行期 | 编译期（依赖 Javac） | **编译期（直接解析 Kotlin 符号）** |
| **运行期性能** | 较慢（查表/装箱） | **零反射开销**（生成代码直调） | **零反射开销** |
| **编译速度** | 无编译生成成本 | 较慢（需先生成 Java Stubs） | **快（比 KAPT 快约 1.5–2 倍）** |
| **Kotlin 特性感知** | 需额外 `kotlin-reflect` 库 | 需通过 Metadata 注解间接读 | **原生感知可空性与挂起函数** |

## 高频追问与关键词

- **追问 1**：什么是泛型桥接方法（Bridge Method）？
  - 关键词：子类重写带泛型的父类方法时参数类型更具体，擦除后签名为 `Object` 的父类方法与子类方法参数不一致，编译器自动生成合成桥接方法转发调用维持多态。
- **追问 2**：星投影 `*` 在 Kotlin 中等价于什么？
  - 关键词：未知泛型实参的统一边界，`MutableList<*>` 等价于 `MutableList<out Any?>`（只读上界，禁止写入）。

## 延伸参考

参考 Android Developers 官方迁移至 KSP 指南与 Kotlin 泛型文档。
