# 综合修复计划：线材库同步 + 材质编辑 + 像素生成器增强

## 问题分析

### 1. 线材库不同步

`useYarnVault.ts` 第157-158行：当 `folderId` 为 `null` 时，使用 `.eq('folder_id', null)` 生成 `folder_id=eq.null`，PostgREST 将其解析为字符串 `"null"` 而非 SQL NULL，导致 400 错误。需要改为 `.is('folder_id', null)`。

### 2. 裁剪照片尺寸不统一

`SwatchLab.tsx` 裁剪后只保存 dataURL 用于显示，但样片报告的尺寸数据来自 `swatchData`（用户手动输入的针数/宽高），与裁剪后的图片实际尺寸无关。这不是 bug — 图片只是参考照片，尺寸数据是独立填写的。但需要确认裁剪后的图片在报告中正确显示（不被再次截取）。

### 3. 材质选择器只能从预设选

`FiberContentSelector.tsx` 使用 `<Select>` 下拉，不允许自定义输入。改为在下拉列表中添加"自定义"选项，放在选项最上面，或改用 Combobox 模式允许用户输入自定义材质名。

### 4. 像素生成器：颜色数量不同步

调整 `colorCount` 滑块后不会自动重新处理图片。需要在滑块旁加一个"同步"按钮，点击后用当前 `colorCount` 重新量化。

### 5. 像素生成器：保存/下载

在画布右侧添加保存按钮，支持下载为 PNG 图片。

### 6. 像素图库

创建数据库表 `pixel_designs` 存储像素图数据，在像素生成器中添加保存/加载库功能。在图库中打开对应像素图加载进像素图编辑页面。

### 7. 定位编织模式

全屏模式显示像素图，底部中间显示当前行号，左右箭头切换行，高亮当前行。

## 修改方案

### 步骤 1: 修复线材库查询 — `useYarnVault.ts`

```typescript
// 第157-158行改为：
if (folderId === null) {
  query = query.is('folder_id', null);
} else if (folderId !== undefined) {
  query = query.eq('folder_id', folderId);
}
```

### 步骤 2: 材质选择器支持自定义输入 — `FiberContentSelector.tsx`

- 将 `<Select>` 替换为 `<Input>` + datalist 模式，或在 Select 中添加"自定义/Custom"选项，选中后显示文本输入框
- 方案：每行改为 `<Input>` 搭配 `<datalist>` 提供预设建议，用户可自由输入

### 步骤 3: 像素生成器颜色同步按钮 — `PixelGenerator.tsx`

- 在 `colorCount` 滑块旁添加"同步"按钮
- 点击后调用 `processImageWithDimensions(uploadedImage, gridWidth, gridHeight)` 重新量化

### 步骤 4: 保存/下载按钮 — `PixelGenerator.tsx`

- 在预览区右上角或右侧添加保存按钮
- 下载为 PNG：将像素网格渲染到 Canvas 并导出

### 步骤 5: 像素图库 — 数据库 + UI

- 创建 `pixel_designs` 表：`id, user_id, name, grid_data (jsonb), width, height, color_palette (jsonb), created_at`
- RLS 策略：用户只能 CRUD 自己的数据
- 在像素生成器页面添加库面板，可保存当前作品、加载已保存作品

### 步骤 6: 定位编织模式 — 新组件 `PixelKnittingGuide.tsx`

- 全屏覆盖层显示像素图
- 当前行高亮（黄色半透明覆盖）
- 底部中间：行号数字（大字体）
- 左右箭头按钮切换上一行/下一行
- 显示当前行的颜色数据统计
- 关闭按钮退出全屏

### 步骤 7: 翻译补充

新增像素生成器相关翻译键

## 实现顺序


| 步骤  | 任务                           | 文件                                         |
| --- | ---------------------------- | ------------------------------------------ |
| 1   | 修复 `.eq(null)` → `.is(null)` | useYarnVault.ts                            |
| 2   | 材质选择器支持自定义输入                 | FiberContentSelector.tsx                   |
| 3   | 新增翻译键                        | translations.ts                            |
| 4   | 颜色同步按钮 + 保存/下载               | PixelGenerator.tsx                         |
| 5   | 创建 pixel_designs 表           | 数据库迁移                                      |
| 6   | 像素图库 UI                      | PixelGenerator.tsx                         |
| 7   | 定位编织模式组件                     | PixelKnittingGuide.tsx, PixelGenerator.tsx |
