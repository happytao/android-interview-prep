---
id: android.net-http-versions-httpdns
aliases: []
title: HTTP/1.1 vs HTTP/2 多路复用 vs HTTP/3（QUIC）及弱网 HttpDNS 优化
summary: 对比 HTTP 三代演进如何逐步攻克应用层与传输层队头阻塞，并解析移动弱网下绕过 LocalDNS 劫持与慢查询的 HttpDNS 实战方案。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - HTTP/2 多路复用与二进制帧
  - TCP 层队头阻塞
  - HTTP/3 QUIC (基于 UDP)
  - 0-RTT 连接迁移
  - HttpDNS 防劫持与加速
references:
  - title: Android Developers - Cronet (HTTP/3 & QUIC Support)
    url: https://developer.android.com/develop/connectivity/cronet
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Developers - Optimizing network requests
    url: https://developer.android.com/develop/connectivity/network-ops/efficiency
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **演进主线（解决并发效率与弱网延迟）**：
  - **HTTP/1.1**：虽然支持持久连接（`Keep-Alive`），但同一条 TCP 上请求/响应必须**一问一答严格保序**（即使开管线化也存在**应用层队头阻塞**），浏览器和移动端只能靠同时建多个（如 5–6 条）TCP 并发连接堆吞吐，浪费握手与内存；
  - **HTTP/2**：把报文切为**二进制帧（Frame）与多路复用流（Stream）**——多个并发请求可交错共享同一条 TCP 连接、支持头部压缩（**HPACK**）和服务端推送；但一旦底层丢了一个 TCP 包，整条连接上的所有 Stream 仍要停下来等待内核按序重传（**TCP 传输层队头阻塞**）；
  - **HTTP/3（QUIC）**：彻底放弃 TCP，直接在 **UDP 之上实现加密可靠传输与独立流控**——各 Stream 互不干扰丢包只影响单条流，同时把握手与 TLS 1.3 合并进 **1-RTT / 0-RTT**，并借助 **`Connection ID` 实现 Wi-Fi ↔ 4G/5G 切换免断连（连接迁移）**！
- **弱网解析加速**：利用 **`HttpDNS`** 直接向权威 DNS 服务器发送 HTTP/HTTPS 请求获取最近最优 IP 列表（配合 OkHttp `Dns` 接口），消除传统运营商 LocalDNS 递归解析慢、域名劫持和跨网调度不准的问题。

## 核心原理解析

### 1. HTTP/3 (QUIC) 为什么在移动端弱网表现极佳？
1. **彻底消除传输层队头阻塞**：一条视频流丢包不会卡死同一条连接上的图片或 API 接口帧接收；
2. **连接迁移（Connection Migration）**：传统 TCP 由 `{源IP, 源端口, 目标IP, 目标端口}` 四元组绑定，手机从家里 Wi-Fi 走出门口切到 5G 时源 IP 变化，所有 TCP 长连接全部失效重握手；而 QUIC 识别连接靠随机生成的 **64 位 `Connection ID`**，换网后带着同一个 ID 即可无缝继续传输，视频/IM 不卡顿；
3. **Android 端接入方式**：OkHttp 默认主要支撑到 HTTP/2（HTTP/3 实验推进中），主流大图/音视频/高并发 App 常接入 Google **`Cronet`**（Chromium 网络栈）或自研 QUIC 库（如腾讯 Mars/字节 TTNet）。

### 2. 接入 `HttpDNS` 时在客户端必须解决的两个技术坑
自定义实现 `OkHttpClient.Builder().dns(httpDns)` 把域名直接替换成目标 IP 连接后，会引发两大 HTTPS 副作用：
- **SNI（Server Name Indication）与 `Host` 缺失**：若直接用 IP 发请求且证书按域名签发，必须保证底层 URL 仍然保留原始域名（OkHttp 内部靠 `Dns` 接口在建连拿 IP 时自动保留原域名做 TLS 握手 SNI 和 `HostnameVerifier` 校验，因此接入 `OkHttp.Dns` 最省心！）；
- **本地缓存与兜底**：必须给 HttpDNS 结果设 TTL 缓存并在异步预解析/过期超时时优雅降级回系统 `Dns.SYSTEM`，避免 DNS 接口本身挂了导致全站断网。

## 图解流程

| 维度 | `HTTP/1.1` | `HTTP/2` | `HTTP/3 (QUIC)` |
| :--- | :--- | :--- | :--- |
| **底层传输协议** | TCP | TCP | **UDP + QUIC 加密传输** |
| **协议载体与头部** | 纯文本明文（大而重复） | 二进制帧 + **HPACK 压缩** | 二进制帧 + **QPACK 压缩** |
| **并发与队头阻塞** | 串行排队（应用层队头阻塞） | **单连接多路复用**（仍受 TCP 传输层队头阻塞） | **各流完全独立（彻底消灭队头阻塞）** |
| **握手延迟 & 切网表现** | 1~3 RTT；切网必断连 | 1~2 RTT；切网必断连 | **0–1 RTT；支持 `Connection ID` 无感切网迁移** |

## 高频追问与关键词

- **追问 1**：为什么有了 HTTP/2 以后，客户端反而应该减少多域名分片（Domain Sharding），尽量把请求合并到统一主域名下？
  - 关键词：HTTP/1.1 时期为了突破并发连接数限制把静态资源拆到 `cdn1/cdn2/cdn3`；但在 HTTP/2 下多域名反而破坏了**单 TCP 多路复用和 HPACK 动态头部表共享**，增加额外 TCP+TLS 握手消耗。
- **追问 2**：OkHttp 中若配置了 `HttpDNS` 绕过系统 DNS 返回了异常挂掉的 IP 节点，怎么实现快速容灾？
  - 关键词：返回多个备选 IP 列表供 `RouteSelector` 逐个降级尝试（Happy Eyeballs / 失败剔除），连续失败打标拉黑并降级回 `Dns.SYSTEM`。

## 延伸参考

参考 Android Developers Cronet 网络栈指南与网络性能优化文档。
