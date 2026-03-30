

# 织片裁剪 + 报告含项目规划 + 材质选择器

## 三个需求

1. **织片照片自主裁剪**：当前上传大图后直接 `readAsDataURL` 显示，会被 `object-cover` 截取。改为上传后弹出裁剪对话框（复用已有的 `ImageCropDialog`），用户自主选择区域。

2. **样片报告包含项目规划器**：`SwatchReportGenerator` 当前不接收项目规划数据。改为传入 `projectPlan` 数据，如果用户填写了（`startingStitches > 0`），则在报告中显示目标尺寸、起针数、补偿后针数等。

3. **材质选择器**：在"保存进线材库"对话框中（`SwatchLab.tsx` 和 `YarnGaugeVault.tsx`），把 `fiber_content` 从自由文本框改为可选材质列表 + 百分比输入。数据库 `fiber_content` 字段仍存储文本（如 "80% Merino, 20% Nylon"），前端负责组装/解析。

## 修改计划

### 1. 织片照片裁剪 — SwatchLab.tsx

- 导入 `ImageCropDialog`
- 添加状态：`cropDialogOpen`, `pendingImageFile`, `cropTarget`（pre/post）
- `handleImageUpload` 改为：先 `readAsDataURL` → 设置 `pendingImageUrl` → 打开 `ImageCropDialog`
- `onCropComplete` 回调将裁剪后的 dataURL 设置到对应的 `preWashImage` / `postWashImage`

### 2. 报告含项目规划 — SwatchReportGenerator.tsx

- Props 新增 `projectPlan?: { targetWidth, targetHeight, startingStitches, startingRows }` 和 `compensatedStitches?: number`, `compensatedRows?: number`
- 在报告中，若 `projectPlan.startingStitches > 0`，渲染"项目规划"区块：目标尺寸、起针数/行数、补偿值
- `SwatchLab.tsx` 传入 `projectPlan={safeProjectPlan}` 和补偿值

### 3. 材质选择器组件 — 新建 `FiberContentSelector.tsx`

**预设材质列表**（可选，不强制）：
- Merino / Alpaca / Cashmere / Cotton / Silk / Linen / Mohair / Nylon / Acrylic / Bamboo / Wool

**UI**：每行 = `[百分比输入框(可选)] + [材质下拉选择]`，可添加多行，底部"添加材质"按钮。
- 百分比输入为 `<Input type="number" min={0} max={100}` placeholder="%" />`
- 材质为 `<Select>` 包含预设选项
- 输出：组装为字符串如 `"80% Merino, 20% Nylon"` 或 `"Merino, Cotton"`（无百分比时）
- 输入：解析已有 `fiber_content` 字符串还原到行

**集成位置**：
- `SwatchLab.tsx` 保存对话框：替换原 `fiber_content: null` 为选择器输出
- `YarnGaugeVault.tsx` 保存对话框：替换原 `fiber_content` 文本输入
- `YarnVault.tsx` 新建/编辑线材：替换原文本输入

### 4. 翻译补充

新增中英文翻译键：
- `fiber.addFiber` / `fiber.percentage` / `fiber.material`
- `report.projectPlan` / `report.targetSize` / `report.castOn` / `report.compensated`
- 各材质名称翻译

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 新增翻译键 | translations.ts |
| 2 | 创建 FiberContentSelector 组件 | FiberContentSelector.tsx |
| 3 | 织片照片裁剪集成 | SwatchLab.tsx |
| 4 | 报告增加项目规划 | SwatchReportGenerator.tsx, SwatchLab.tsx |
| 5 | 材质选择器集成到保存对话框 | SwatchLab.tsx, YarnGaugeVault.tsx, YarnVault.tsx |

