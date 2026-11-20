---
id: android.context-variants-token
aliases: []
title: Application、Activity、Service Context 差异与 Dialog 弹窗报错本质
summary: 理解 ContextWrapper 与 ContextImpl 装饰器架构，厘清 Activity 独占的主题能力与 Window Token，彻底解答非 Activity Context 弹 Dialog 崩报错因。
priority: must-know
difficulty: basic
frequency: 5
estimatedMinutes: 5
status: published
keywords:
  - ContextImpl 委托
  - ContextThemeWrapper 主题
  - Window Token 校验
  - getApplicationContext 避坑
  - BadTokenException
references:
  - title: Android Developers - Context
    url: https://developer.android.com/reference/android/content/Context
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Source - ContextImpl.java (AOSP)
    url: https://cs.android.com/android/platform/superproject/main/+/main:frameworks/base/core/java/android/app/ContextImpl.java
    type: aosp
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **继承与装饰架构**：`Context` 是抽象接口，真正干活的是实现类 **`ContextImpl`**；`Application` 与 `Service` 直接继承 `ContextWrapper` 委托给 `ContextImpl`，而 `Activity` 继承 **`ContextThemeWrapper`**，因此**只有 Activity 具备独立完整的 UI 主题信息（Theme）和与窗口绑定关联的 `Window Token`**。
- **数量计算公式**：一个应用进程中常见 Context 总数 = **`Activity 数量 + Service 数量 + 1（Application）`**。
- **Dialog 报错本质**：用 `ApplicationContext` / `Service` 弹普通 `AlertDialog` 会直接抛 `WindowManager$BadTokenException`，原因是普通应用子窗口依赖依附的 `Activity` 提供合法 **`Window Token`** 给 WMS 校验归属与层级（除非使用系统级窗口并申请悬浮窗权限 `SYSTEM_ALERT_WINDOW`）。

## 核心原理解析

### 1. 为什么不能所有地方都传 `ApplicationContext`？
- **UI 渲染主题丢失**：`Application` 使用的是系统/应用全局基础 Theme，拿它去 `LayoutInflater.from(appCtx).inflate()` 出来的控件会丢失 Activity 专属自定义深浅色/Material 主题属性（如 `?attr/colorPrimary` 变错或报错）；
- **弹窗失败**：`Dialog` 内部创建自己的 `PhoneWindow` 并通过 `WindowManager.addView()` 向 WMS 申请窗口；WMS 检查到没有合法 `mToken`（Activity 在 `attach()` 时由 `ATMS` 下发的身份令牌）直接拒绝并抛出 **`Unable to add window -- token null is not valid`**；
- **启动 Activity 栈错乱**：用 `ApplicationContext` 调 `startActivity()` 默认没有任务栈归属，必须加 `FLAG_ACTIVITY_NEW_TASK`（会把目标页按新栈规则拉起）。

### 2. 什么时候必须用 `applicationContext`？
凡是生命周期**可能超越单个 Activity**的对象（如**单例工具类、Toast、全局 DB/MMKV、OkHttp、WorkManager、Glide 全局或应用级初始化**），必须持有 **`context.applicationContext`** 防止长生命周期对象逆向死锁住已关闭的 Activity 导致严重内存泄漏。

## 图解流程

| Context 类型 | 直接基类 | 支持 UI Theme | 拥有 Window Token | 生命周期范围 | 典型适用与禁区 |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **`Activity`** | `ContextThemeWrapper` | **支持** | **有** | 页面级 | Dialog、LayoutInflater、页面级启动；禁交单例长存 |
| **`Service`** | `ContextWrapper` | 不支持 | 无 | 服务级 | 后台任务、`startService`；禁弹普通 Dialog |
| **`Application`** | `ContextWrapper` | 不支持（仅全局） | 无 | 进程级 | 单例、Toast、数据库/SP/网络/第三方 SDK 初始化 |

## 高频追问与关键词

- **追问 1**：`getApplication()` 和 `getApplicationContext()` 一定返回同一个对象吗？什么时候会不一样？
  - 关键词：在 `Activity`/`Service` 内绝大多数时候指向同一 `Application` 实例；但在 **`ContentProvider`** 极端早于 `Application.onCreate()` 初始化阶段，或跨进程使用 `createPackageContext()` 创建的上下文里，`getApplicationContext()` 可能为空或返回不同包装上下文；且 `getApplication()` 仅存在 `Activity` 和 `Service` 接口中，普通只拿到 `Context` 引用的类只能调 `getApplicationContext()`。
- **追问 2**：为什么 `Toast.makeText(applicationContext, ...)` 不传 Activity 也能正常弹出而不报 `BadTokenException`？
  - 关键词：Toast 属于系统 **`NotificationManagerService (NMS)`** 统管排队的特殊 `TYPE_TOAST` 系统级窗口，系统服务端会由 NMS 专门下发和创建独立 Token，无需宿主 Activity 提供。

## 延伸参考

参考 Android 官方 `Context` API 文档与 AOSP `ContextImpl` 源码理解装饰器模式实现。
