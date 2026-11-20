---
id: android.kotlin-sealed-nullsafety
aliases: []
title: sealed class/interface、data class 与空安全底层实现
summary: 密封类利用编译器受限继承实现 when 穷尽校验，空安全在 JVM 字节码层通过 @Nullable/@NotNull 与 Intrinsics 断言防 NPE。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 4
status: published
keywords:
  - sealed class/interface
  - 穷尽检查
  - data class
  - Intrinsics.checkNotNull
  - 空安全字节码
references:
  - title: Kotlin 官方文档 - Sealed classes and interfaces
    url: https://kotlinlang.org/docs/sealed-classes.html
    type: official
    verifiedAt: "2026-11-20"
  - title: Kotlin 官方文档 - Null safety
    url: https://kotlinlang.org/docs/null-safety.html
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **一句话切入**：`sealed` 把继承边界锁死在编译期已知的有限子类集，使状态机 `when` 无需 `else` 兜底；`data class` 自动合成结构相等、解构与浅拷贝；空安全则靠编译期类型约束 + 字节码运行时断言兜底 Java 互调风险。
- **高频工程价值**：在 MVI 架构中广泛用 `sealed interface UiState / UiIntent` 建模页面状态与事件，新增状态分支时未处理的界面会在编译期直接报错。

## 核心原理解析

### 1. `sealed class` vs `sealed interface`
- **枚举升级版**：`enum` 每个枚举项只能是单例且所有实例共享相同字段结构；`sealed` 允许不同子类拥有**完全不同的独立构造参数和状态数据**（例如 `Success(val items)` vs `Error(val code, val msg)`）。
- **`sealed interface` 优势（Kotlin 1.5+）**：支持一个子类同时实现多个密封接口、且跨文件同模块可见，配合 `object` 单例减少无状态分支的对象创建。
- **底层约束**：所有直接子类必须位于同一模块同一包内，编译器生成受限构造器或 `PermittedSubclasses` 元数据。

### 2. `data class` 的合成方法与注意事项
编译器自动生成 `equals()`、`hashCode()`、`toString()`、`copy()` 和按主构造函数顺序生成的 `componentN()`（支持解构赋值 `val (id, name) = user`）：
- **浅拷贝陷阱**：`copy()` 仅复制主构造函数属性引用，若含可变集合（如 `MutableList`）仍共享同一底层引用；
- **非主构属性不参与**：写在类体内部的字段不会进入 `equals`/`hashCode`/`copy`。

### 3. 空安全在 JVM 字节码层的落地方案
- 编译期为非空参数/返回值生成 **`@org.jetbrains.annotations.NotNull`**，可空类型生成 **`@Nullable`**；
- 对于暴露给 Java 调用的非空 `public` 方法，Kotlin 在方法入口自动插入 **`Intrinsics.checkNotNullParameter(arg, "arg")`** 运行时快速失败断言，防止 Java 传入 `null` 在深层才爆出隐晦异常。

## 图解流程

```mermaid
flowchart LR
  A["定义 sealed interface UiState"] --> B["Loading / Content(list) / Error(msg)"]
  B --> C["when(state) 穷尽校验"]
  C -->|"新增 Empty 状态分支"| D["未覆盖分支的页面编译期直接报错提醒"]
```

## 高频追问与关键词

- **追问 1**：Java 调用 Kotlin 非空函数传入 `null` 会什么时候崩溃？
  - 关键词：方法入口立即抛 `NullPointerException`（`Intrinsics.checkNotNullParameter` 断言），如果是 Kotlin 调 Java 返回值（平台类型 `String!`），则需在接住处显式声明可空性避免延迟爆雷。
- **追问 2**：`?.`、`?:` 和 `!!` 的字节码开销差异？
  - 关键词：本质都是编译为常规 `if (x != null)` 条件跳转，性能与手写 Java 判空一致，唯独 `!!` 在为 null 时直接抛 Kotlin NPE。

## 延伸参考

结合 Kotlin 官方 Sealed Classes 与 Null Safety 规范排查工程里 Java/Kotlin 互调的平台类型空指针隐患。
