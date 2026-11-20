---
id: android.ble-stability-permissions
aliases:
  - ble-stability
title: BLE 连接稳定性治理（GATT 133 / 串行队列）与 Android 12+ 蓝牙权限适配
summary: 剖析 Android BLE 开发两大痛点：用单工串行异步队列根治 GATT 并发丢包与经典 133 错误码重试策略，以及 Android 12+ 新版蓝牙权限模型与免定位声明适配清单。
priority: bonus
difficulty: hard
frequency: 3
estimatedMinutes: 6
status: published
keywords:
  - GATT 单工异步串行队列
  - status 133 成因与断开关闭重试
  - autoConnect 参数权衡
  - Android 12+ BLUETOOTH_SCAN / CONNECT
  - neverForLocation 免定位权衡
references:
  - title: Android Developers - Bluetooth permissions
    url: https://developer.android.com/develop/connectivity/bluetooth/bt-permissions
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - BluetoothGatt API Reference
    url: https://developer.android.com/reference/android/bluetooth/BluetoothGatt
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **BLE 实战为什么经常掉链子？面试官最想听的两个工程化基建**：
  1. **GATT 通信必须封装“单工串行指令队列”**：Android 底层蓝牙栈同一时刻**只允许 1 个 GATT 异步操作在路上**！如果你刚发完写特征 `writeCharacteristic` 还没等来 `onCharacteristicWrite` 回调就立刻调用读特征或再写一条，第二条命令会被协议栈直接**静默返回 `false` 丢弃**（甚至连报错都没有）；工程上必须设计 FIFO 队列 + 超时机制（单条超时如 3s 自动释放锁推进下一条）；
  2. **臭名昭著的 `status 133`（`GATT_ERROR`）治理闭环**：原因极为杂乱（底层 GATT 客户端句柄泄露未关闭、扫描并发建链、蓝牙协议栈缓存异常或信号极弱超时）；规范动作是：**每次异常或断开必须执行 `gatt.disconnect()` 后调 `gatt.close()`（绝不能只 `disconnect` 导致系统 30+ 个底层 `client_if` 槽位漏光全机无法再连 BLE！），主线程稍作延时退避（300ms）清理缓存后重建连接**。
- **Android 12+ 蓝牙权限大变革（隐私合规高频考察）**：告别早期仅搜索手环就逼用户授权“GPS 位置信息”的历史吐槽，Android 12（API 31）拆出细粒度运行时权限 **`BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT`、`BLUETOOTH_ADVERTISE`**；若蓝牙扫描仅连外设并不用来做室内 Beacon 定位，加上 **`neverForLocation`** 声明即可彻底免申请位置权限与免开 GPS 开关！

## 核心原理解析

### 1. 为什么必须把 GATT 操作做成“带超时保护的串行队列”？
蓝牙物理射频与系统 Bluedroid/Fluoride 协议栈设计为半双工异步命令模型：
- 例如初始化阶段刚连上，业务上往往既要 `requestMtu(512)`、又要写 `0x2902` Descriptor 打开通知、还要再紧接着读取设备电量与固件版本号；如果直接在代码里连续调用这几个方法，后面 2 个几乎必失败；
- **标准架构**：使用 Kotlin 协程 `Mutex` / 单线程 `Channel` 或 Handler 状态机，每条指令（`Read` / `Write` / `WriteDescriptor` / `RequestMtu` / `DiscoverServices`）封装为一个 `BleCommand` 入队；队首执行后**挂起等待对应的 `BluetoothGattCallback` 完成回调或超时定时器触发**，再触发 `nextCommand()`，保证无论上层业务多并发调用都不丢不乱。

### 2. `connectGatt(..., autoConnect)` 参数的经典误区
- **`autoConnect = false`（直接建链）**：主动直连物理扫描到的广播设备，速度快（几百毫秒~2秒连上），但如果设备当前不在身边或没在广播，大约 **30 秒后会触发超时失败返回 133**；
- **`autoConnect = true`（后台自动重连）**：蓝牙栈会在后台持续低功耗监听该 MAC 地址设备何时现身并自动连上（不会 30 秒超时失败），但**首次连接极慢且在不同厂商芯片上如果连接未知未缓存过的设备很容易直接卡死无响应**！
- **最佳实践**：初次扫描发现并建链一律传 **`false`** 保证秒连；只有“历史已绑定配对过的穿戴设备在后台等待无感重连”场景才考虑 `true`（或结合 `false` 超时后由上层控制扫描出现再重连）。

## 图解流程

| 维度 / 系统版本 | Android 11 及以下 (API <= 30) | Android 12+ (API 31+) | 开发实战与合规关键注意点 |
| :--- | :--- | :--- | :--- |
| **扫描权限 (`Scan`)** | 清单静默 `BLUETOOTH` + `BLUETOOTH_ADMIN` + **动态定位权限 `ACCESS_FINE_LOCATION`** | 动态申请 **`BLUETOOTH_SCAN`**（声明 `usesPermissionFlags="neverForLocation"` 则免定位） | Android 11 以下不仅要授权定位，**部分国产机不开启系统顶部“位置/GPS开关”就彻底扫不到任何 BLE 结果** |
| **连接与服务发现 (`Connect`)** | 静默权限无需运行时弹窗 | 必须动态申请 **`BLUETOOTH_CONNECT`** | 未拿到 `BLUETOOTH_CONNECT` 调 `connectGatt`/`getName` 在 Target 31+ 会直接抛 **`SecurityException`** 崩溃 |
| **`status 133` 错误处理** | `close()` 释放 GATT 句柄 -> 清扫描停止 -> 退避重连 | 同左，并注意部分机型切主线程发起 `connectGatt` | **每建一次 `BluetoothGatt` 终结必调 `gatt.close()`**，防止耗尽系统有限的 `client_if`（典型仅 ~32 个） |
| **服务缓存刷新** | 硬件升级改了 UUID 手机仍读到旧缓存表 | 同左（若外设支持 Generic Attribute Service 变更通知可自动刷） | 极端情况可在重新连上前反射调用隐藏方法 `BluetoothGatt.refresh()` 清本地缓存，或硬件端规范升级协议 |

## 高频追问与关键词

- **追问 1**：`gatt.disconnect()` 和 `gatt.close()` 有什么本质区别？只调 `disconnect()` 不调 `close()` 会出什么线上故障？
  - 关键词：`disconnect()` 只是断开当前蓝牙射频链路，**底层的 `BluetoothGatt` 客户端句柄（`client_if`）依然被你的 App 占用着**（可供短暂重新 `gatt.connect()` 复用）；但如果你每次重试都新调一遍 `device.connectGatt(...)` 却不清理旧对象调用 `close()`，系统全局蓝牙底层的客户端注册表槽位（通常几十个上限）很快会被占满漏光，**后果是全手机所有 App（包括系统设置）都无法再连上任何 BLE 设备，甚至报错 133 直至开关蓝牙或重启手机**！
- **追问 2**：如何在 App 退到后台或息屏之后，仍然维持某些特定手环/医疗传感器的稳定心跳接收而不被系统冻结？
  - 关键词：在清单声明合法前台服务类型 **`foregroundServiceType="connectedDevice"`**（Android 14+ 强制）配合通知栏保活；或采用系统原生的 **`CompanionDeviceManager`（CDM）伴侣设备配对框架**（Android 8.0+ / Android 12+ 增强），允许系统在设备靠近范围时后台唤醒 App 执行蓝牙数据同步且大幅放宽后台扫描与唤醒限制。

## 延伸参考

参考 Android Developers 蓝牙权限适配规范与 `BluetoothGatt` API 文档。
