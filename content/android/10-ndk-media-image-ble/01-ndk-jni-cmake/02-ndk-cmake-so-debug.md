---
id: android.ndk-cmake-so-debug
aliases:
  - cmake-so-debug
title: CMakeLists.txt 构建、ABI 兼容与 .so 加载排查基础
summary: 解析 NDK 默认构建工具 CMakeLists.txt 核心指令、四大 CPU ABI 架构兼容规则、System.loadLibrary 搜索链路，以及 UnsatisfiedLinkError 与 Native 符号排查实战手段。
priority: bonus
difficulty: medium
frequency: 3
estimatedMinutes: 5
status: published
keywords:
  - CMakeLists add_library / target_link_libraries
  - abiFilters (arm64-v8a vs armeabi-v7a)
  - 64位强制要求与多 ABI 混合崩溃
  - UnsatisfiedLinkError 排查
  - nm / readelf 符号诊断
references:
  - title: Android Developers - Configure CMake
    url: https://developer.android.com/ndk/guides/cmake
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Android ABIs
    url: https://developer.android.com/ndk/guides/abis
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **CMake 构建一条龙核心指令**：现代 Android Studio / AGP 放弃了老旧 `ndk-build (Android.mk)`，统一通过 Gradle `externalNativeBuild` 驱动 **`CMakeLists.txt`** 编译打包：
  - `cmake_minimum_required` → `add_library(native-lib SHARED src/...)` 编译动态库 `.so` → `find_library(log-lib log)` 查找系统 NDK 预置库（`liblog.so`/`libandroid.so`/`libz.so`）→ `target_link_libraries(native-lib ${log-lib})` 链接依赖并产出最终 `libnative-lib.so`。
- **ABI（Application Binary Interface）选型与混用大坑**：
  - 当前主流应用商店均已强制 **64 位兼容**，真机主力为 **`arm64-v8a`**（向下可兼容运行 32 位 `armeabi-v7a`），模拟器与老平板可能用到 `x86_64`；
  - **绝对红线**：**同进程内绝不允许 32 位和 64 位 `.so` 混载**！Android 进程一旦优先找到任意一个带 `arm64-v8a` 目录的三方 SDK，系统会锁定整只 App 以 **64 位 Zygote 进程**启动，此时如果另一个老库只提供了 `armeabi-v7a`，加载直接报 `dlopen failed / UnsatisfiedLinkError`！因此全工程必须统一 `abiFilters` 收口并校验所有 AAR 的 ABI 覆盖一致。

## 核心原理解析

### 1. `System.loadLibrary("foo")` 查找顺序与 `UnsatisfiedLinkError` 根因
调用 `System.loadLibrary("foo")` 时，`BaseDexClassLoader` 内部的 `DexPathList.nativeLibraryDirectories` 会依次扫描：APK 私有库路径（或已解压的 `/data/app/.../lib/arm64`）、应用热更/动态下发补充目录（`findLibrary`）。
- 常见 **`UnsatisfiedLinkError`** 四大元凶：
  1. **ABI 目录不匹配**：64 位进程去读 `lib/arm64-v8a/libfoo.so`，结果打出来的包里只有 `armeabi-v7a`；
  2. **静态注册包名类名被混淆**：R8 把声明 `external fun` 的 Java/Kotlin 类名或方法名改掉了，导致 C++ 符号表里的 `Java_com_xxx_foo` 对不上号；
  3. **传递依赖的辅助 `.so` 未先加载或丢失**：A 动态依赖 B（如 `libc++_shared.so`），在老系统上未按拓扑顺序先 `loadLibrary("c++_shared")` 或打包缺失；
  4. **C++ 未加 `extern "C"` 导致 Name Mangling（名称修饰）**：C++ 编译器会把函数名改写带参数类型后缀，必须用 **`extern "C"`** 暴露标准 C 符号！

### 2. Android 15（API 35）16KB Page Size `.so` 对齐新坑
传统 Android 内存页为 4KB，Android 15+ 全面推进 16KB 页大小设备。如果老 `.so` 编译链接参数没有加上 **`-Wl,-z,max-page-size=16384`**（NDK r28+ 默认已开启），旧 ELF LOAD 段未按 16KB 对齐，系统在安装或 `dlopen` 阶段会直接拒绝加载报错。

## 图解流程

| 排查问题现象 | 对应排查工具与指令 | 常见定位结果与修复手段 |
| :--- | :--- | :--- |
| 报错找不到 `.so` 或 32/64 位缺失 | `unzip -l app.apk \| grep .so` / APK Analyzer | 发现某个三方 AAR 多出了 `arm64-v8a` 或缺少目标 ABI；统一配置 `ndk.abiFilters` 或换用一致架构 SDK |
| 报错找到库但找不到方法符号 | **`nm -D libfoo.so \| grep Java_`** | 1) Java 类被 R8 混淆（补 `-keepclasseswithmembernames`）2) 忘记 `extern "C"` 导致 C++ Name Mangling |
| 查看 `.so` 依赖与 16KB 页对齐 | **`readelf -d` / `readelf -l libfoo.so`** | 查看 `NEEDED` 字段确认缺 `libc++_shared.so`；看 Program Header `Align` 是否达到 `0x4000` (16KB) |
| Native 崩溃堆栈十六进制偏移 | **`llvm-addr2line` / `ndk-stack`** | 拿带完整调试信息的 unstripped `.so`（`build/intermediates/merged_native_libs`）将 Tombstone 地址还原为具体源码行 |

## 高频追问与关键词

- **追问 1**：多个三方 SDK 都带了 `libc++_shared.so`，如果静态链接（`c++_static`）和动态链接（`c++_shared`）混用会发生什么？
  - 关键词：官方强烈规定**工程内存在多个互相通信或依赖的共享库时必须全部统一使用 `ANDROID_STL=c++_shared`**；若各自静态链接两份 C++ 运行时，会导致全局静态变量多副本、`std::string`/异常跨 `.so` 传递时堆分配器不一致引发静默崩溃。
- **追问 2**：为什么 Release 包中的 `.so` 体积远大于源码预期，怎么瘦身与安全还原崩溃？
  - 关键词：Release APK 打包阶段 AGP 会自动调用 `strip` 剥离 `.so` 中的 `.symtab`/DWARF 符号表减小包体；工程 CI 必须把未裁剪前的 **Debug Symbols（`native-debug-symbols.zip`）归档保存**，线上收集到 Crash 堆栈地址才能用 `ndk-stack` 准确符号化。

## 延伸参考

参考 Android NDK Configure CMake 与 ABI 兼容性官方指南。
