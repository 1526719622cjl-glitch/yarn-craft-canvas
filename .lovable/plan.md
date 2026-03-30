

# 修复与增强：样片照片显示 + 像素生成器功能扩展

## 5个需求

1. **样片照片框太小** — 当前 `h-32`（128px）固定高度 + `object-cover` 截取。改为 `object-contain` + 自适应高度，保留裁剪后的完整图片。
2. **像素图库UI不可见** — 代码已有 `showLibrary` Dialog，但按钮可能被隐藏在 `pixelGrid.length > 0` 条件外。检查确认：Library 按钮在第1277行已在条件外，应该可见。可能是用户未注意到 FolderOpen 图标按钮。改为更明显的带文字按钮。
3. **导出PNG增加选项** — 可选包含/不包含网格线和边缘定位数字（行列号）。
4. **导入图片 + 成品旋转功能** — 在导入图片后和编辑画布时增加90°旋转整个画布的功能。
5. **橡皮擦区域清除** — 当前橡皮擦是单像素擦除。改为鼠标拖动时持续擦除（已支持通过 `handleMouseEnter`），但需要支持更大区域的"框选清除"模式：长按时标记区域，松开后批量清除。

## 修改方案

### 1. 样片照片自适应显示 — `SwatchLab.tsx`

- 第315行：`h-32 object-cover` → `max-h-48 object-contain`（pre-wash）
- 第377行：同样修改（post-wash）
- 这样裁剪后的图片会完整显示，不再被二次截取

### 2. 像素图库按钮更明显 — `PixelGenerator.tsx`

- 将 FolderOpen 图标按钮改为带文字按钮，如 `图库/Library`
- 确保在没有 pixelGrid 时也能访问库（已在条件外，OK）

### 3. PNG导出选项 — `PixelGenerator.tsx`

- 点击下载按钮时弹出小对话框，包含三个 Checkbox：
  - ☑ 包含网格线
  - ☑ 包含行列定位数字
  - 导出按钮
- 修改 `handleDownloadPNG` 接受参数：`showGrid`, `showNumbers`
- 有网格线时每个像素格子画边框
- 有定位数字时在画布上/左添加刻度标注

### 4. 旋转整个画布 — `PixelGenerator.tsx`

- 新增 `rotateCanvas90` 函数：将整个 pixelGrid 旋转90°，交换 gridWidth/gridHeight
- 在工具栏或画布顶部增加旋转按钮（RotateCw 图标）
- 导入图片后和编辑中均可使用

### 5. 橡皮擦区域清除 — `PixelGenerator.tsx`

当前橡皮擦在拖动时已经逐像素擦除（`handleMouseEnter` 中 `isDragging && currentTool === 'eraser'` 会调用 `handleCellClick`）。这已实现拖拽擦除。

增强：橡皮擦支持可调大小（如 1x1, 3x3, 5x5），拖动时一次擦除周围区域。在工具栏选择橡皮擦时显示大小选择器。

### 6. 翻译补充

新增键：`pixel.exportOptions`, `pixel.includeGrid`, `pixel.includeNumbers`, `pixel.rotateCanvas`, `pixel.eraserSize`

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 样片照片 object-contain + 自适应高度 | SwatchLab.tsx |
| 2 | 新增翻译键 | translations.ts |
| 3 | PNG导出选项对话框 + 网格/数字渲染 | PixelGenerator.tsx |
| 4 | 旋转画布功能 | PixelGenerator.tsx |
| 5 | 橡皮擦大小选择 + 区域擦除 | PixelGenerator.tsx |
| 6 | 图库按钮更醒目 | PixelGenerator.tsx |

