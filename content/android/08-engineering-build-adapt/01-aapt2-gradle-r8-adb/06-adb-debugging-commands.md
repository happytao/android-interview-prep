---
id: android.adb-debugging-commands
aliases: []
title: Android 工程师高频 ADB 调试与系统诊断指令清单
summary: 梳理日常真机调试、日志过滤、四大组件与栈状态探测（dumpsys）、内存/帧率性能分析、文件拉取及端口转发的高频 ADB 实战命令集合。
priority: core
difficulty: basic
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - adb logcat 过滤导出
  - dumpsys activity / meminfo / gfxinfo
  - am start / am kill
  - adb bugreport 现场抓取
  - adb reverse / forward 端口转发
references:
  - title: Android Developers - Android Debug Bridge (adb)
    url: https://developer.android.com/tools/adb
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - dumpsys system diagnostics
    url: https://developer.android.com/tools/dumpsys
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **本质角色**：`ADB（Android Debug Bridge）` 是基于 C/S 架构（本地 `adb client` ↔ PC 端 `adb server` 5037 端口 ↔ 手机端 `adbd` 守护进程）的开发者调试大动脉。
- **五大核心排查场景命令思维**：
  1. **设备与应用安装管理**：`adb devices`、`adb install -r -d -t`（覆盖/降级/测试包）、`adb uninstall`、`pm list packages`；
  2. **日志捕获**：`adb logcat -v threadtime *:E`、`--pid=<pid>` 按进程隔离过滤、`-c` 清空历史缓冲；
  3. **进程与页面栈/组件状态（`am` + `dumpsys activity`）**：查当前顶层栈页面定位老代码归属、模拟后台低内存强杀进程 `am kill` 测试状态恢复；
  4. **性能与电量诊断（`dumpsys meminfo/gfxinfo/battery`）**：无需打开笨重 AS Profiler 秒查当前进程 Java/Native/Graphics 内存占用与过去 120 帧掉帧率（Janky frames）；
  5. **网络与文件联调**：`adb pull/push`、`adb reverse`（让手机直连电脑本地启动的调试后端接口，无视复杂内网跨域与局域网防火墙！）、`adb bugreport` 打包抓取包含 ANR `traces` 的完整系统诊断包。

## 核心原理解析

### 1. 日常最救命的 `dumpsys` 与 `am` 实战组合
- **接手庞大老项目一秒找出当前手机界面对应哪个 Activity / Fragment**：
  `adb shell dumpsys activity top | grep -E "ACTIVITY|Added Fragments"`（Windows PowerShell 用 `findstr`）；
- **精确检查当前任务栈（BackStack）顺序验证 `launchMode`**：
  `adb shell dumpsys activity activities`（查看每个 `Task` 内部从底到顶的栈历史）；
- **无侵入秒测进程被系统后台杀掉后重启恢复是否会空指针崩掉**：
  切到后台按 Home 键 → 执行 `adb shell am kill <package_name>`（模拟 LMKD 杀后台保留任务栈快照）→ 再点桌面图标看能否完美由 `SavedStateHandle` / `onSaveInstanceState` 恢复原样！

### 2. `adb reverse` vs `adb forward` 极简区别
- **`adb reverse tcp:8080 tcp:8080`**：把**手机访问 `127.0.0.1:8080`** 反向映射穿透转发给 **电脑本机 `localhost:8080`**（前端 H5 / 本地 Mock 后端 / React Native / WebView 联调极神器，插根 USB 线连电脑本地服务根本不需要手机和电脑处于同一个 Wi-Fi！）；
- **`adb forward tcp:9222 localabstract:webview_devtools_remote_<pid>`**：把 **电脑本地端口** 转发进 **手机端进程/端口**（用于电脑端连手机做端口代理抓包或底层的调试协议连接）。

## 图解流程

| 排查需求 | 高频核心 ADB 指令模板 | 实战关键用途 |
| :--- | :--- | :--- |
| **定位当前屏幕页面** | `adb shell dumpsys activity top` | 秒查未知页面具体 Activity / Fragment 类名与栈归属 |
| **检查进程内存构成** | `adb shell dumpsys meminfo <pkg>` | 快速核对 Java Heap / Native Heap / Graphics / Views / Activities 数量（查泄漏一眼看 `Activities` 计数！） |
| **检查卡顿与掉帧** | `adb shell dumpsys gfxinfo <pkg> framestats` | 统计 `Total frames`、`Janky frames` 比例及 90th/95th/99th 帧耗时分布 |
| **模拟后台被杀恢复** | `adb shell am kill <pkg>` | 验证退后台强杀后点图标回到前页会不会 NPE 崩溃 |
| **强杀 / 拉起深链** | `adb shell am force-stop <pkg>` / `am start -d "app://..."` | 重置冷启动状态 / 免手动点直接测试 DeepLink 跳转路径 |
| **USB 联调电脑服务** | `adb reverse tcp:8080 tcp:8080` | 手机 WebView/App 直接用 `http://127.0.0.1:8080` 调通电脑端本地开发服务器 |
| **抓取完整诊断与 ANR** | `adb bugreport ./bugreport.zip` | 在无 Root 真机上合规提取系统历史 ANR `traces` 与 Tombstones |

## 高频追问与关键词

- **追问 1**：非 Root 真机想看自己 App 出现 ANR 时的 `traces.txt` 怎么办？
  - 关键词：高版本系统已禁止直接 `adb pull /data/anr/traces.txt` 读全盘公共区；标准解法是执行 **`adb bugreport`** 生成系统诊断压缩包（解压后看 `FS/data/anr/`），或者接入代码里的 **`ApplicationExitInfo`**（API 30+）直接读取自身进程的官方 ANR Trace 流。
- **追问 2**：怎么快速用一行命令看某个 App 里到底有没有发生 `Activity` 内存泄漏，甚至不用等几分钟抓 Hprof？
  - 关键词：连续反复打开关闭目标页面 5 次，回到首页执行一次强制 GC 后跑 **`adb shell dumpsys meminfo <pkg>`** 查看底部 `Objects` 区块里的 **`Activities`** 数量——如果本该只有 1 个根页面，数值却变成了 6，直接实锤存在 Activity 内存泄漏！

## 延伸参考

参考 Android Developers ADB 命令行全集与 `dumpsys` 诊断指南。
