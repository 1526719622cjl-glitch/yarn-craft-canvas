

# UI 布局优化 - 主格线修复 + Preview/ColorLegend 调整

## 问题分析

### 1. 10×10 主格线位置错误
当前代码：
```typescript
// 主格线位置
style={{ left: x * cellWidth - 1, width: 2 }}  // x = 10, 20, 30...
```

问题：主格线应该在第10个格子的**右边缘**（即第10条竖线），但数字标记计算方式与格线不一致。

**修正方案：**
- 主格线位置 = `lineNum * cellWidth` (lineNum = 10, 20, 30...)
- 这条线应该**精准覆盖**第10个格子与第11个格子之间的边界，并且横着竖着的各自主格线之间必须间隔10格，不能有多的线。
- 此外数字在放大缩小时自行比例优化，不要因为放大缩小而数字变形

### 2. UI 布局问题

**当前布局（4列）：**
```
┌────────────┬──────────────────────┬────────────┐
│  Settings  │      Preview         │   Legend   │
│  (1 col)   │      (2 cols)        │  (1 col)   │
└────────────┴──────────────────────┴────────────┘
```

**目标布局：**
```
┌────────────┬───────────────────────────────────┐
│  Settings  │           Preview                 │
│  (1 col)   │           (3 cols)                │
│            ├───────────────────────────────────┤
│            │         Color Legend              │
│            │         (under Preview)           │
└────────────┴───────────────────────────────────┘
```

### 3. 滚动条位置
滚动条应紧贴画布边缘，不在整个 UI 底部。当前的 `InfiniteCanvas` 结构需要确保滚动容器正确包裹。

---

## 修复方案

### 文件 1: `src/components/pixel/InfiniteCanvas.tsx`

#### 主格线位置修正

```typescript
// 修正主格线位置 - 确保在第10/20/30个格子的右边缘
const gridOverlay = useMemo(() => {
  if (!showLODGrid || !showGridLines) return null;

  const majorLines: React.ReactNode[] = [];
  
  // 垂直主格线：在第10, 20, 30...个格子之后
  // 位置 = lineNum * cellWidth（这是第lineNum个格子的右边缘）
  for (let lineNum = 10; lineNum <= width; lineNum += 10) {
    majorLines.push(
      <div
        key={`v-${lineNum}`}
        className="absolute top-0 bottom-0 bg-primary/40 pointer-events-none"
        style={{ 
          left: lineNum * cellWidth,  // 精准位置，不需要 -1
          width: 2 
        }}
      />
    );
  }
  
  // 水平主格线：在第10, 20, 30...行之后
  for (let lineNum = 10; lineNum <= height; lineNum += 10) {
    majorLines.push(
      <div
        key={`h-${lineNum}`}
        className="absolute left-0 right-0 bg-primary/40 pointer-events-none"
        style={{ 
          top: lineNum * cellHeight,  // 精准位置，不需要 -1
          height: 2 
        }}
      />
    );
  }
  
  return majorLines;
}, [width, height, cellWidth, cellHeight, showLODGrid, showGridLines]);
```

#### 标尺数字对齐修正

```typescript
// 水平标尺 - 数字居中对齐到主格线
const horizontalRuler = useMemo(() => {
  if (!showLODLabels) return null;
  
  const markers: React.ReactNode[] = [];
  for (let lineNum = 10; lineNum <= width; lineNum += 10) {
    markers.push(
      <div
        key={lineNum}
        className="absolute text-[9px] font-medium text-muted-foreground"
        style={{ 
          // 数字中心对齐到格线位置
          left: lineNum * cellWidth,
          transform: 'translateX(-50%)',
          top: 2
        }}
      >
        {lineNum}
      </div>
    );
  }
  return markers;
}, [width, cellWidth, showLODLabels]);
```

### 文件 2: `src/pages/PixelGenerator.tsx`

#### 布局调整

将 4 列布局改为 Settings 左侧固定，右侧 Preview + Color Legend 垂直堆叠：

```typescript
// 修改主布局
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Settings - 左侧 1 列 */}
  <motion.div variants={itemVariants} className="glass-card p-6 space-y-5">
    {/* ... 现有内容 ... */}
  </motion.div>

  {/* Main Area - 右侧 2 列，包含 Preview + Color Legend */}
  <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
    {/* Preview Card - 拉宽 */}
    <div className="glass-card p-6 min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Yarn Grid Preview</h2>
        {/* ... */}
      </div>
      
      {/* InfiniteCanvas 画布区域 */}
      {pixelGrid.length > 0 ? (
        <div className="flex-1">
          <InfiniteCanvas ... />
        </div>
      ) : (
        /* Empty state */
      )}
    </div>
    
    {/* Color Legend - 在 Preview 下方 */}
    {pixelGrid.length > 0 && (
      <div className="glass-card p-6">
        <ColorLegend 
          pixelGrid={pixelGrid} 
          ignoredColor={ignoredColor}
          onColorClick={handlePaletteColorClick}
          selectedColor={selectedColor}
        />
      </div>
    )}
  </motion.div>
</div>
```

---

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/pixel/InfiniteCanvas.tsx` | 1. 修正主格线位置计算（移除 `-1`）<br>2. 确保标尺数字与主格线精准对齐 |
| `src/pages/PixelGenerator.tsx` | 1. 布局从 4 列改为 3 列<br>2. Preview 占 2 列<br>3. Color Legend 移到 Preview 下方<br>4. 滚动条结构保持紧贴画布 |

---

## 预期效果

1. **主格线位置正确** - 10×10 粗线在第10/20/30个格子右边缘，与标尺数字精准对齐
2. **Preview 更宽** - 占据右侧 2/3 空间
3. **Color Legend 在下方** - Preview 下面独立卡片显示
4. **滚动条紧贴画布** - 水平/垂直滚动条在画布边缘

