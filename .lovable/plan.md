

# 样片报告图片 + 定位编织UI + 图库缩略图优化

## 修改内容

### 1. 样片报告图片尺寸同步 — `SwatchReportGenerator.tsx`
第153、157行的图片仍为 `h-32 object-cover`，与 SwatchLab 已改的 `max-h-48 object-contain` 不一致。改为 `max-h-48 object-contain` 保持一致，完整显示裁剪后的图片。

### 2. 定位编织按钮更醒目 — `PixelGenerator.tsx`
当前第1401行是一个小图标按钮（`size="icon" h-8 w-8`），不易注意。改为带文字的醒目按钮，使用 `variant="default"` 主色调突出显示，类似 `开始定位编织 / Start Knitting`。

### 3. 图库缩略图放大 — `PixelGenerator.tsx`
当前第1570行缩略图只有 `w-12 h-12`（48px），太小。改为类似线材库的卡片式网格布局：
- 从列表布局改为 `grid grid-cols-2 gap-4` 网格布局
- 缩略图放大到 `w-full h-32`（与线材库风格一致）
- 名称和操作按钮在缩略图下方
- Dialog 宽度改为 `max-w-2xl`

## 实现顺序

| 步骤 | 文件 |
|------|------|
| 1 | SwatchReportGenerator.tsx — 图片 `object-contain` + `max-h-48` |
| 2 | PixelGenerator.tsx — 定位编织按钮放大+带文字 |
| 3 | PixelGenerator.tsx — 图库改为网格卡片布局+大缩略图 |

