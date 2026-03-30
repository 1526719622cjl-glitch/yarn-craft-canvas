

# 修复与增强计划

## 问题分析

### 1. 线材库加载后图片未同步
`YarnGaugeVault.tsx` 第124-142行：`handleLoadYarn` 只调了 `setSwatchData` 和 `onLoadYarn`，而 `SwatchLab.tsx` 第610-613行的回调只在 `yarn.pre_wash_photo_url` 有值时设置图片。问题在于保存时 `handleSaveToCloud`（第204-245行）上传的是 base64 dataURL，但 `uploadSwatchPhoto` 可能上传失败或返回 null（需检查），或者数据库中 `pre_wash_photo_url`/`post_wash_photo_url` 为 null（`YarnGaugeVault` 保存时第117行直接写 `null`）。

**根因**：有两个保存入口：
- `SwatchLab.tsx` 的 `handleSaveToCloud`：会上传图片并存 URL ✅
- `YarnGaugeVault.tsx` 的 `handleSaveYarn`：第117行硬编码 `pre_wash_photo_url: null, post_wash_photo_url: null` ❌

`YarnGaugeVault` 没有访问图片 state 的途径，因此始终写 null。

此外，`handleLoadYarn` 中线材名称没有被传到前端显示更新——SwatchLab 上的 `yarnName`/`yarnBrand` 不会被加载回来。

### 2. 线材名称未在最前面显示
`handleLoadYarn` 只调了 `setSwatchData`，没有设置 SwatchLab 的 `yarnName`/`yarnBrand` state。需要在 `onLoadYarn` 回调中同步。

### 3. 像素颜色调整仍以当前颜色为基准
`useEffect`（第306-355行）从 `baseImageDataUrl` 重新提取 K-means 调色板，但随后将当前 `pixelGrid` 的每个像素映射到新调色板的最近色。问题是：如果之前已经量化过（比如从16色量化到8色），当前 grid 中只剩8种颜色，再从16色量化时，映射的源头已经是失真的8色版本。

**修正**：不应映射当前 grid 到新调色板，而应从原始基准图重新处理整个图像，生成全新的 grid（保持当前方向/尺寸）。

### 4. 自定义颜色增加图片吸色 + 一键替换色号
当前自定义颜色区只有 color picker。需要：
- 上传图片吸色（类似 YarnStashPalette 的 eyedropper 功能）
- 一键将某色号的所有格子替换为当前选中颜色

### 5. 定位编织增强
- 编织进度跟踪：当前行号可保存到图库中的像素图
- 点击格子高亮/加粗标记进度
- 行内颜色序列已正确显示（实际排列顺序）

### 6. 图解标注加文本框
`AnnotationToolbar` 当前有 pen、highlight、note（textarea 便签）。需要增加一个直接输入文字的 text 工具，在图片上放置文本标签。

---

## 实现方案

### 步骤 1：修复线材加载同步 — `SwatchLab.tsx`
在 `onLoadYarn` 回调中同步 `yarnName`、`yarnBrand`、图片：
```tsx
<YarnGaugeVault compact onLoadYarn={(yarn) => {
  setYarnName(yarn.name);
  setYarnBrand(yarn.brand || '');
  if (yarn.pre_wash_photo_url) setPreWashImage(yarn.pre_wash_photo_url);
  if (yarn.post_wash_photo_url) setPostWashImage(yarn.post_wash_photo_url);
}} />
```

同时修复 `YarnGaugeVault.tsx` 的 `handleSaveYarn`：接收当前图片作为 props 或通过回调传入，上传后存 URL。但考虑到 `YarnGaugeVault` 是独立组件，更简洁的方案是在保存时也传图片。可以新增 `preWashImage`/`postWashImage` props 给 `YarnGaugeVault`，保存时也上传。

### 步骤 2：像素颜色调整从原图重建 — `PixelGenerator.tsx`
修改 `useEffect`（第306-355行）：从 `baseImageDataUrl` 重新渲染到当前 `gridWidth x gridHeight`，生成全新 grid，而不是映射当前 grid。

### 步骤 3：自定义颜色吸色 + 全局替换 — `PixelGenerator.tsx`
- 在自定义颜色区增加图片上传吸色按钮（复用 YarnStashPalette 的逻辑）
- 在调色板区每个颜色旁增加"一键替换"按钮：选中某色后，点击另一色块可将该色的所有格子替换

### 步骤 4：定位编织进度保存 — `PixelKnittingGuide.tsx` + `usePixelDesigns.ts`
- 在 `pixel_designs` 表增加 `knitting_progress` 列（jsonb，存当前行号和高亮格子）
- `PixelKnittingGuide` 接收 `designId` prop，点击格子可标记高亮，退出时保存进度
- 进度条显示百分比

### 步骤 5：图解标注加文本工具 — `AnnotationToolbar.tsx` + `PatternViewer.tsx`
新增 `text` 工具类型：点击放置不可编辑文本标签（与 note 区别：更轻量，直接显示文字不带 textarea 框）

---

## 涉及文件

| 步骤 | 文件 |
|------|------|
| 1 | `SwatchLab.tsx`, `YarnGaugeVault.tsx` |
| 2 | `PixelGenerator.tsx` |
| 3 | `PixelGenerator.tsx` |
| 4 | `PixelKnittingGuide.tsx`, `usePixelDesigns.ts`, 数据库迁移 |
| 5 | `AnnotationToolbar.tsx`, `PatternViewer.tsx` |

