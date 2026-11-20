---
id: android.okhttp-interceptor-chain
aliases: []
title: OkHttp 责任链拦截器机制（五大内置拦截器顺序与自研拦截器挂载点）
summary: 剖析 OkHttp RealInterceptorChain 递归传递调用模型、五大核心内置拦截器精确分工，以及自定义 addInterceptor 与 addNetworkInterceptor 的本质区别。
priority: must-know
difficulty: medium
frequency: 5
estimatedMinutes: 7
status: published
keywords:
  - RealInterceptorChain 责任链
  - 五大内置拦截器顺序
  - addInterceptor 应用拦截器
  - addNetworkInterceptor 网络拦截器
  - 拦截器防重与Token刷新
diagram: OkHttpChainSvg
references:
  - title: Square OkHttp - Interceptors Guide
    url: https://square.github.io/okhttp/features/interceptors/
    type: official
    verifiedAt: "2026-11-20"
  - title: Square OkHttp - Calls & Architecture
    url: https://square.github.io/okhttp/features/calls/
    type: official
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **核心架构模式**：`OkHttp` 把整个 HTTP 请求处理流程拆解成一条可插拔的**双向责任链（`RealInterceptorChain`）**——请求顺着链表从上往下依次经过各个 `Interceptor.intercept(chain)` 加工，到了最底部真正读写 Socket 后，响应 **`Response` 再沿着原路逆向逐层回溯**。
- **五大内置拦截器严格顺序（必背核心）**：
  1. `RetryAndFollowUpInterceptor`（失败重连与 3xx 重定向）；
  2. `BridgeInterceptor`（补齐 `Host`/`Content-Length`/`Cookie`/`Accept-Encoding: gzip` 与解压）；
  3. `CacheInterceptor`（依据 `Cache-Control` / `ETag` 决定命中本地磁盘缓存还是网络）；
  4. `ConnectInterceptor`（从 `RealConnectionPool` 复用连接或新建 Socket+TLS，创建 `Exchange`）；
  5. `CallServerInterceptor`（利用 Okio 向服务器写入请求头/体并读取响应流）。
- **两大自定义挂载点区别**：**`addInterceptor`（应用拦截器）** 跑在整条链最开头，**每次业务调用只走 1 次**，无视中间重定向与缓存拦截；**`addNetworkInterceptor`（网络拦截器）** 插在 `Connect` 和 `CallServer` 之间，**每发生一次真实网络往返都会触发**（能拿到真实服务端 IP、重定向中间包和原始网络 Header），若命中本地缓存则不执行！

## 核心原理解析

### 1. 递归调用栈式责任链的精巧设计
`RealInterceptorChain.proceed(request)` 的核心动作就是把拦截器下标 `index + 1` 包装进一个新 `Chain` 对象，传给当前拦截器 `interceptors[index].intercept(next)`：
- **前半段**（调用 `chain.proceed(request)` 之前）：负责修改 `Request`（加请求头、签参数、或提前短路拦截返回本地模拟 Response）；
- **后半段**（拿到 `val response = chain.proceed(request)` 之后）：负责拦截校验 `Response`（处理 401 Token 过期刷新并重新 `proceed`、写日志、解密响应体）。

### 2. 开发高频实战：全局 Token 401 无感刷新放在哪一层？
- 如果放在 **`Authenticator`**（OkHttp 专用于处理 HTTP 401 质询的标准回调，在 `RetryAndFollowUp` 内部集成）或放在 **应用拦截器 `addInterceptor()`** 中均可行；
- **关键坑点**：多线程并发发出 5 个接口同时遇到 Token 过期 401 时，**必须加锁（如 `synchronized` / `Mutex`）+ 双重检查当前最新 Token 是否已被前一个请求刷新过**，防止 5 个请求一起并发调 5 次 `refreshToken` 接口把新 Token 互踢作废！

## 图解流程

:::diagram OkHttpChainSvg
:::

## 高频追问与关键词

- **追问 1**：如果在 `addInterceptor` 日志拦截器里直接调用 `response.body?.string()` 打印响应报文，为什么后续 Retrofit/业务层读数据会崩溃报错 `IllegalStateException: closed`？
  - 关键词：因为 `ResponseBody` 底层流是一次性单向消费流，`string()` 读完就会顺带自动关闭流！正确打印日志必须使用 **`response.peekBody(maxBytes)`**（借助 Okio `BufferedSource.peek()` 拷贝预览）或参考官方 `HttpLoggingInterceptor`。
- **追问 2**：如何在自定义应用拦截器中安全地中断/短路直接返回一个本地缓存或假响应？
  - 关键词：在 `intercept(chain)` 内直接构造 `Response.Builder()...build()` 返回即可，不再调用 `chain.proceed(request)`，后续整个链条和真实网络建连都会优雅跳过。

## 延伸参考

参考 Square OkHttp 官方 Interceptors 与 Calls 架构指南排查实际工程中拦截器顺序与流关闭问题。
