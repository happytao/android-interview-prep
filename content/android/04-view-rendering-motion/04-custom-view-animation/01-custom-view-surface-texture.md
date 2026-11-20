---
id: android.custom-view-surface-texture
aliases: []
title: 自定义 View 关键避坑与 SurfaceView/TextureView 渲染选型
summary: 梳理自定义 View 应对 wrap_content/Padding/硬件加速的工程规范，并对比普通 View、SurfaceView 与 TextureView 的渲染线程与视图变换差异。
priority: core
difficulty: medium
frequency: 4
estimatedMinutes: 5
status: published
keywords:
  - AT_MOST wrap_content 兜底
  - Padding 自主适配
  - SurfaceView 双缓冲独立层
  - TextureView 硬件层变换
  - 硬件加速兼容
references:
  - title: Android Developers - Create custom view components
    url: https://developer.android.com/develop/ui/views/layout/custom-views/create-view
    type: official
    verifiedAt: "2026-11-20"
  - title: Android Source - SurfaceView and TextureView
    url: https://source.android.com/docs/core/graphics/arch-sv-and-tv
    type: aosp
    verifiedAt: "2026-11-20"
updatedAt: "2026-11-20"
---

## 面试答题思路

- **自定义 View 四大必查规范**：
  1. **测量处理 `wrap_content`**：直接继承 `View` 在 `onMeasure()` 中若不处理 `MeasureSpec.AT_MOST`，`wrap_content` 会退化为填满父容器，必须给默认宽/高兜底；
  2. **手动处理 `padding`（及子View的 `margin`）**：直接继承 `View` 时系统不会自动扣掉 `paddingLeft/Top/Right/Bottom`，需在 `onDraw()` 坐标系计算内边距；自定义 `ViewGroup` 在 `onMeasure`/`onLayout` 需额外叠加子视图 `MarginLayoutParams`；
  3. **禁止在 `onDraw()` 内 `new` 对象**：如 `new Paint()` / `new Path()` / `new Rect()`（60/120Hz 高频执行引发内存抖动掉帧）；
  4. **硬件加速兼容与状态保存**：如极少数复杂 `BlurMaskFilter` / 旧滤镜在部分机型需局部 `LAYER_TYPE_SOFTWARE`，跨旋转需重写 `onSaveInstanceState`。
- **视频/相机/游戏渲染控件选型**：优先从“**是否需要子线程独立高频绘制**”和“**是否需要做平移缩放圆角动画**”两个维度在 `View` / `SurfaceView` / `TextureView` 间权衡。

## 核心原理解析

### 1. `SurfaceView` 为什么能在子线程刷画面而不报跨线程异常？
普通 `View` 没有独立 `Surface`，全部画在宿主窗口共享的同一块图层里受主线程 `ViewRootImpl` 调度控制；而 **`SurfaceView` 自己向 WMS 申请了一块独立的硬件 `Surface` 表面**（直接位于应用窗口下方，并在应用层打出一个“透明空洞”透出下层内容）：
- 它拥有专属的 `SurfaceHolder`，允许在任意**后台子线程**上锁 `lockCanvas()` → 绘图 → `unlockCanvasAndPost()` 独立刷新提交给 `SurfaceFlinger`，完全不占用主线程消息队列，且耗电比 `TextureView` 更低；
- **致命代价**：因为它的物理图层独立于普通 View 树之外，**无法正常跟随父容器做平滑旋转/缩放/圆角裁剪/透明度动画**，放进 `RecyclerView`/`ScrollView` 快速滑动时容易出现黑边或滞后撕裂。

### 2. `TextureView` 如何解决动画与层级融合问题？
`TextureView`（Android 4.0 引入，必须开启硬件加速）**不创建独立窗口洞层**，而是把后台线程 / GPU / `MediaCodec` 产出的图像流直接捕获进一个 **`SurfaceTexture`** 转化为普通 OpenGL 外部纹理，并作为常规 View 节点嵌入到应用 View 树中绘制：
- **优势**：无缝支持平移、旋转、透明渐变、圆角裁剪与放入列表平滑滑动；
- **代价**：多了一次 GPU 纹理绑定采样与内部合成开销，比 `SurfaceView` 内存占用略高、延迟与功耗多 1–2 帧。

## 图解流程

| 对比维度 | 普通 `View` | `SurfaceView` | `TextureView` |
| :--- | :--- | :--- | :--- |
| **绘制线程** | 仅主线程 | **支持独立后台子线程** | **支持独立后台子线程** |
| **底层图层模型** | 共享应用窗口 Surface | **独立硬件 Surface（窗口挖洞叠放）** | `SurfaceTexture` 转 GL 纹理融入应用窗口 |
| **动画/变形/圆角裁剪** | 完全支持 | **不支持常规 View 变换与列表平滑滚动** | **完全支持**（可旋转/透明度/截屏） |
| **功耗与性能延迟** | 一般 UI 最优 | **极低功耗与零额外纹理拷贝延迟** | 功耗和内存稍高于 `SurfaceView` |
| **典型适用场景** | 静态图、图表、常规自定义控件 | 全屏播放器、高精度游戏画布、相机预览 | 小窗播放、需圆角/缩放动画的 Feed 流视频 |

## 高频追问与关键词

- **追问 1**：Android 7.0+ 针对 `SurfaceView` 在列表滚动时黑边与同步问题做了什么底层改进？
  - 关键词：Android 7.0 将 `SurfaceView` 位置同步直接并入 **`RenderThread`** 渲染节点同步流，极大减轻了滚动错位，但在高复杂度缩放旋转裁剪上仍不如 `TextureView` 或 `SurfaceControl`。
- **追问 2**：自定义 View 时，`canvas.save()` 与 `canvas.restore()` 成对出现的作用是什么？
  - 关键词：用于隔离局部坐标系变换（`translate`/`rotate`/`scale`）和区域裁剪（`clipRect`），避免污染后续叠加图层甚至父容器的 `Canvas` 状态。

## 延伸参考

参考 Android Developers 自定义视图组件指南与 AOSP SurfaceView/TextureView 架构对比文档。
