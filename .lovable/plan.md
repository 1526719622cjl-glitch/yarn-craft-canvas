

# Swatch Lab & Pixel Generator 功能增强计划

## 问题分析

### 1. Swatch Lab - Yarn Info 加载数据不一致

**问题根源**：
当前 `YarnGaugeVault.tsx` 的 `handleLoadYarn` 函数 (lines 165-185) 存在数据转换问题：
- 保存时存储的是 `stitches_per_10cm` 和 `rows_per_10cm`（密度 × 10）
- 加载时重新计算 `stitchesPreWash/PostWash`，但假设 `preWash = postWash`，丢失了洗前数据
- 原始 swatch 尺寸信息（`preWashWidth/Height`）没有被存储到数据库

**修复方案**：
- 数据库迁移：为 `yarn_entries` 表添加字段存储完整的洗前数据
- 修改保存逻辑：存储完整的 `swatchData` 结构
- 修改加载逻辑：完整还原所有字段

### 2. Swatch Lab - 工具尺寸二级联动菜单

**需求**：
```
第一级：[ 钩针 (Hook) ] 或 [ 棒针 (Needles) ]
第二级：预设常用尺寸 2.0mm - 10.0mm + 手动输入
```

**实现位置**：在 Pre-Wash / Post-Wash Swatch 卡片下方添加新区块

### 3. Swatch Lab - 生成样片报告

**需求**：生成可分享的卡片图（适合小红书/电子笔记）

**内容包含**：
- 线材信息（名称、品牌、成分）
- 工具尺寸
- 洗前/洗后密度对照表
- 收缩率分析
- 用户备注

**技术方案**：使用 HTML Canvas 生成图片，支持下载

### 4. Pixel Generator - Undo/Redo 按钮

**需求**：在画板工具栏添加撤销/重做按钮

**位置**：Preview 卡片头部，与 "Yarn Grid Preview" 标题同行

**状态管理**：
- 历史为空时左箭头置灰
- 处于最新状态时右箭头置灰

---

## 数据库迁移

### 新增字段到 `yarn_entries` 表

```sql
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_width_cm numeric;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_height_cm numeric;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS stitches_pre_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS rows_pre_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS stitches_post_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS rows_post_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS tool_type text CHECK (tool_type IN ('hook', 'needle'));
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS tool_size_mm numeric;
```

---

## 文件修改

### 文件 1: `src/hooks/useYarnVault.ts`

**修改内容**：
- 更新 `YarnEntry` 接口，添加新字段
- 确保类型与数据库一致

```typescript
export interface YarnEntry {
  // ... existing fields ...
  // 新增字段
  pre_wash_width_cm: number | null;
  pre_wash_height_cm: number | null;
  stitches_pre_wash: number | null;
  rows_pre_wash: number | null;
  stitches_post_wash: number | null;
  rows_post_wash: number | null;
  tool_type: 'hook' | 'needle' | null;
  tool_size_mm: number | null;
}
```

### 文件 2: `src/store/useYarnCluesStore.ts`

**修改内容**：
- 在 `SwatchData` 接口添加工具信息
- 新增工具类型和尺寸状态

```typescript
export interface SwatchData {
  // ... existing fields ...
  toolType: 'hook' | 'needle' | null;
  toolSizeMm: number | null;
}
```

### 文件 3: `src/pages/SwatchLab.tsx`

**修改内容**：

1. **工具尺寸二级联动菜单**：在 Post-Wash Swatch 下方添加

```typescript
// 工具尺寸选择器
const TOOL_SIZES = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0];

// UI 结构
<div className="glass-card p-6">
  <h3>Tool Size</h3>
  <div className="grid grid-cols-2 gap-4">
    {/* 第一级：钩针/棒针 */}
    <Select value={toolType} onValueChange={setToolType}>
      <SelectItem value="hook">钩针 (Hook)</SelectItem>
      <SelectItem value="needle">棒针 (Needles)</SelectItem>
    </Select>
    
    {/* 第二级：尺寸选择 + 手动输入 */}
    <div className="flex gap-2">
      <Select value={toolSize}>
        {TOOL_SIZES.map(size => <SelectItem value={size}>{size}mm</SelectItem>)}
        <SelectItem value="custom">Custom...</SelectItem>
      </Select>
      {/* 手动输入框（当选择 custom 时显示） */}
    </div>
  </div>
</div>
```

2. **样片报告生成功能**：

```typescript
// 新增组件
<Button onClick={generateSwatchReport}>
  <FileImage className="w-4 h-4 mr-2" />
  生成样片报告
</Button>

// 生成函数
const generateSwatchReport = () => {
  // 使用 Canvas API 绘制报告卡片
  // 包含：线材信息、工具尺寸、洗前/洗后密度、收缩率、备注
  // 导出为 PNG 图片下载
};
```

3. **修复保存逻辑**：完整存储 swatch 数据

```typescript
createEntry.mutate({
  // ... existing fields ...
  // 新增完整 swatch 数据
  pre_wash_width_cm: safeSwatchData.preWashWidth,
  pre_wash_height_cm: safeSwatchData.preWashHeight,
  stitches_pre_wash: safeSwatchData.stitchesPreWash,
  rows_pre_wash: safeSwatchData.rowsPreWash,
  stitches_post_wash: safeSwatchData.stitchesPostWash,
  rows_post_wash: safeSwatchData.rowsPostWash,
  tool_type: toolType,
  tool_size_mm: toolSizeMm,
});
```

### 文件 4: `src/components/swatch/YarnGaugeVault.tsx`

**修改内容**：修复加载逻辑

```typescript
const handleLoadYarn = (yarn: YarnEntry) => {
  // 完整还原所有字段
  setSwatchData({
    preWashWidth: yarn.pre_wash_width_cm ?? yarn.post_wash_width_cm ?? 10,
    preWashHeight: yarn.pre_wash_height_cm ?? yarn.post_wash_height_cm ?? 10,
    stitchesPreWash: yarn.stitches_pre_wash ?? yarn.stitches_per_10cm ?? 20,
    rowsPreWash: yarn.rows_pre_wash ?? yarn.rows_per_10cm ?? 28,
    postWashWidth: yarn.post_wash_width_cm ?? 10,
    postWashHeight: yarn.post_wash_height_cm ?? 10,
    stitchesPostWash: yarn.stitches_post_wash ?? yarn.stitches_per_10cm ?? 20,
    rowsPostWash: yarn.rows_post_wash ?? yarn.rows_per_10cm ?? 28,
    toolType: yarn.tool_type,
    toolSizeMm: yarn.tool_size_mm,
  });
};
```

### 文件 5: `src/components/swatch/SwatchReportGenerator.tsx` (新建)

**内容**：样片报告生成组件

```typescript
// Canvas 绘制逻辑
// - 背景渐变
// - 线材信息区域
// - 工具尺寸显示
// - 洗前/洗后密度对照表格
// - 收缩率可视化
// - 二维码（可选，链接回项目）
// - 导出为 PNG
```

### 文件 6: `src/pages/PixelGenerator.tsx`

**修改内容**：添加 Undo/Redo 按钮到工具栏

1. **添加 Undo/Redo 状态管理**：

```typescript
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';

// 在组件内添加
const {
  state: undoablePixelGrid,
  set: setUndoableGrid,
  undo: undoGrid,
  redo: redoGrid,
  canUndo,
  canRedo,
} = useUndoRedo(pixelGrid, 30);

// 键盘快捷键
useUndoRedoKeyboard(undoGrid, redoGrid, pixelGrid.length > 0);
```

2. **在 Preview 头部添加按钮**：

```typescript
// 位置：Preview Card 标题栏右侧
<div className="flex items-center gap-2">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        onClick={undoGrid}
        disabled={!canUndo}
        className="rounded-xl h-8 w-8"
      >
        <Undo className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
  </Tooltip>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="icon"
        onClick={redoGrid}
        disabled={!canRedo}
        className="rounded-xl h-8 w-8"
      >
        <Redo className="w-4 h-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
  </Tooltip>
</div>
```

---

## 修改文件汇总

| 文件 | 修改类型 | 内容 |
|------|---------|------|
| 数据库迁移 | SQL | 添加 8 个新字段到 `yarn_entries` |
| `src/hooks/useYarnVault.ts` | 更新 | 扩展 `YarnEntry` 接口 |
| `src/store/useYarnCluesStore.ts` | 更新 | 扩展 `SwatchData` 接口添加工具信息 |
| `src/pages/SwatchLab.tsx` | 更新 | 添加工具尺寸选择器 + 报告生成按钮 + 修复保存逻辑 |
| `src/components/swatch/YarnGaugeVault.tsx` | 更新 | 修复加载逻辑完整还原数据 |
| `src/components/swatch/SwatchReportGenerator.tsx` | 新建 | 样片报告生成组件 |
| `src/pages/PixelGenerator.tsx` | 更新 | 添加 Undo/Redo 按钮 + 状态管理 |

---

## 预期效果

1. **Yarn 数据一致性** - 保存和加载的数据完全一致，包括洗前/洗后所有字段
2. **工具尺寸选择** - 二级联动菜单，支持钩针/棒针选择 + 预设尺寸 + 手动输入
3. **样片报告** - 一键生成精美卡片图，适合分享到社交平台
4. **Pixel Generator Undo/Redo** - 工具栏显眼位置的撤销/重做按钮，状态正确反馈

