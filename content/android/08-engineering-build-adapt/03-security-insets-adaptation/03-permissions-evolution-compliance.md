---
id: android.permissions-evolution-compliance
aliases: []
title: Android 运行时权限全版本演进与隐私合规实战
summary: 梳理从 Android 6.0 动态权限到 Android 10–14+ 分区存储、后台定位分离、细分媒体、通知及部分照片授权的演进规律与隐私合规前置弹窗规范。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - 6.0 动态权限模型
  - shouldShowRequestPermissionRationale
  - Android 11 后台定位分离
  - Android 13 通知与细分媒体权限
  - Android 14 部分照片访问与合规指引
references:
  - title: Android Developers - Permissions on Android
    url: https://developer.android.com/guide/topics/permissions/overview
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Partial access to photos and videos (API 34)
    url: https://developer.android.com/about/versions/14/changes/partial-photo-video-access
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **核心演进趋势（权限越来越细粒度、拒绝越容易、隐私合规审查越严）**：
  - **Android 6.0 (API 23)**：首创安装时静默授普通权限，危险权限（相机/存储/定位/麦克风等）必须在**运行时弹出系统授权框**；
  - **Android 10 (API 29)**：引入**分区存储（Scoped Storage）**，加设“仅在使用期间允许”与独立 `ACCESS_BACKGROUND_LOCATION`；
  - **Android 11 (API 30)**：新增“**仅这一次**”单次授权、自动吊销长期不用 App 权限、禁止“前台+后台定位”在同一系统弹窗同时索取；
  - **Android 12 (API 31)**：定位允许用户仅授**粗略模糊位置**、蓝牙拆分无需定位权限的 `BLUETOOTH_SCAN`/`CONNECT`；
  - **Android 13 (API 33)**：拆掉宽泛的 `READ_EXTERNAL_STORAGE` 改为**三大细分媒体权限**（图片/视频/音频），并新增运行时推送通知权限 **`POST_NOTIFICATIONS`**；
  - **Android 14 (API 34)**：引入**部分照片和视频访问（`READ_MEDIA_VISUAL_USER_SELECTED`）**，用户可只挑 1 张照片授权给 App 看；且更推荐直接使用**免权限的系统 `PhotoPicker`**！

## 核心原理解析

### 1. 标准运行时权限申请与拒绝态引导逻辑
使用现代 Jetpack `ActivityResultContracts.RequestPermission` / `RequestMultiplePermissions`：
- 若 `checkSelfPermission == GRANTED` → 直接执行；
- 若未授权且 **`shouldShowRequestPermissionRationale()` 返回 `true`**（说明上次用户拒绝过但没勾选“不再询问”）：先弹出应用自定义的温和**用途说明解释框（Rationale Dialog）**，解释为什么需要这个权限再拉起系统窗；
- 若请求结果仍被拒且 **`shouldShowRequestPermissionRationale()` 返回 `false`**（在已请求过的情况下即代表用户点了永久拒绝 / 多次拒绝不再弹出系统框）：礼貌引导跳转到系统应用设置页 `Settings.ACTION_APPLICATION_DETAILS_SETTINGS`；
- **国内合规红线（工信部 / 应用商店审核）**：**绝不能一进 App 启动页就把定位/存储/相机全套权限连弹一遍！** 必须做到① 同意隐私协议前严禁初始化读取敏感设备信息 SDK（OAID/AndroidId/Mac/已安装列表）；② **按需场景化触发（用到扫码才申相机，触发前先弹出友好权限目的浮层说明）**，拒绝后不得强制闪退或阻塞无关主流程使用。

## 图解流程

| Android 版本 | 权限重磅变更点 | 开发者核心适配动作 |
| :--- | :--- | :--- |
| **Android 6.0 (23)** | 引入危险权限运行时申请 | 切勿全放 Splash 一次性索取，改用 `ActivityResultContracts` 场景化申请 |
| **Android 10–11 (29–30)** | 分区存储、单次授权、后台定位分离、包可见性 `<queries>` | 先申前台精确定位，通过后再跳设置页或单独引出后台定位申请 |
| **Android 12 (31)** | 精确/大致定位降级选择、独立蓝牙权限 | 申 `ACCESS_FINE_LOCATION` 必须同时附带 `ACCESS_COARSE_LOCATION` |
| **Android 13 (33)** | 细分媒体权限 + 运行时 **`POST_NOTIFICATIONS`** | 适配 `READ_MEDIA_IMAGES/VIDEO/AUDIO`，发通知前查通知权限 |
| **Android 14+ (34+)** | **部分照片选择访问 (`READ_MEDIA_VISUAL_USER_SELECTED`)** | 选单图直接换免权限 **`PhotoPicker`**；相册组件必须兼容只选了部分图片刷新重选逻辑 |

## 高频追问与关键词

- **追问 1**：在 Android 14 上用户在系统弹窗选了“允许部分访问（Select photos and videos）”后，用 `checkSelfPermission(READ_MEDIA_IMAGES)` 返回的是 `DENIED` 还是 `GRANTED`？
  - 关键词：返回的是 **`DENIED`**！因为用户并没有给你全盘相册权限，只给了 **`READ_MEDIA_VISUAL_USER_SELECTED = GRANTED`**！如果不单独判断这个新权限直接当“被拒绝”弹窗阻止用户，就会导致功能彻底卡死无法看选中的图；正确逻辑是只要 `READ_MEDIA_IMAGES` 或 `READ_MEDIA_VISUAL_USER_SELECTED` 任一为 `GRANTED` 就允许进自定义选图页，并在顶部提示“可再次管理扩充授权照片”。
- **追问 2**：Android 11 引入的 **包可见性（Package Visibility）** 限制会导致什么常见老代码失效？
  - 关键词：调用 `PackageManager.queryIntentActivities()` / `getPackageInfo("com.tencent.mm")` 判断微信是否安装会全部返回找不到（防恶意 App 扫描全机安装列表）；必须在 Manifest 顶部显式声明 **`<queries>`** 精准列出需要交互的目标包名或 Action，否则跳转微信分享/支付宝失败。

## 延伸参考

参考 Android Developers Permissions 概览与 Android 14 部分照片权限适配文档。
