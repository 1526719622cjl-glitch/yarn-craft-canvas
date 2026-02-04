

# 画布布局优化 - 滚动条位置与标尺对齐

## 问题分析

当前存在三个问题：
1. **滚动条位置不对** - 滚动条在整个 UI 最底端，而不是紧贴画布外侧
2. **标尺数字位置错误** - 10/20/30 等数字没有精准对齐到主格线位置
3. **主格线定位** - 异色粗线应该在第10条格线**之后**，而不是之前

## 修复方案

### 文件: `src/components/pixel/InfiniteCanvas.tsx`

#### 1. 滚动条位置调整

将滚动容器从最外层移到画布区域内部，使滚动条紧贴画布边缘：

```typescript
// 当前结构（滚动条在最外层）
<div className="flex-1 overflow-auto">  {/* 滚动条在这里 */}
  <div>...</div>  {/* 标尺 + 画布 */}
</div>

// 修改为（固定标尺 + 画布区域滚动）
<div className="flex-1 flex flex-col">
  {/* 固定的水平标尺区域 */}
  <div className="flex">
    <div className="w-6" />  {/* 左上角空白 */}
    <div className="flex-1 overflow-hidden">{horizontalRuler}</div>
  </div>
  
  {/* 垂直标尺 + 可滚动画布 */}
  <div className="flex-1 flex">
    <div className="w-6 overflow-hidden">{verticalRuler}</div>
    <div className="flex-1 overflow-auto" ref={containerRef}>  {/* 滚动条紧贴画布 */}
      {children}
    </div>
  </div>
</div>
```

#### 2. 标尺数字精准对齐

标尺数字应该对齐到主格线位置（第10/20/30条线的右边缘）：

```typescript
// 当前：数字在第 x 个格子的中心
style={{ left: x * cellWidth + cellWidth / 2 - 8, top: 4 }}

// 修正：数字对齐到第 10/20/30 条格线的右边缘
// 第10条格线在 index=9 的格子右边，即 10 * cellWidth 位置
for (let lineNum = 10; lineNum <= width; lineNum += 10) {
  markers.push(
    <div
      key={lineNum}
      className="absolute text-[9px] font-medium text-muted-foreground text-right"
      style={{ 
        left: lineNum * cellWidth - 12,  // 数字右对齐到格线位置
        top: 4,
        width: 12,
      }}
    >
      {lineNum}
    </div>
  );
}
```

#### 3. 主格线位置修正

主格线应该在每10个格子**之后**绘制（即第10/20/30个格子的右边缘）：

```typescript
// 当前：从 x=10 开始，位置在 10*cellWidth（第11格子左边）
for (let x = 10; x < width; x += 10) {
  style={{ left: x * cellWidth }}  // 这是正确的
}

// 确认：这个位置是第10格子的右边缘，也就是第10条竖线的位置
// 如果 width=100，则绘制在 10, 20, 30, ..., 90 位置
```

### 布局结构图

```
┌─────────────────────────────────────────┐
│  Controls Bar (缩放控制)                 │
├────┬────────────────────────────────┬───┤
│    │    10    20    30    40       │ ↑ │  ← 水平标尺（固定）
├────┼────────────────────────────────┼───┤
│ 10 │┌──────────────────────────────┐│   │
│    ││                              ││   │
│ 20 ││      画布内容区域            ││ ↕ │  ← 滚动条在画布右侧
│    ││                              ││   │
│ 30 ││                              ││   │
│    │└──────────────────────────────┘│   │
├────┴────────────────────────────────┴───┤
│    ← ─────────── →                      │  ← 水平滚动条在画布底部
└─────────────────────────────────────────┘
```

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/pixel/InfiniteCanvas.tsx` | 1. 重构布局使滚动条紧贴画布<br>2. 标尺数字精准对齐格线<br>3. 保持现有的鼠标缩放功能 |

## 关键代码变更

### 标尺数字对齐修正

```typescript
// 水平标尺 - 数字对齐到格线
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
          top: 4 
        }}
      >
        {lineNum}
      </div>
    );
  }
  return markers;
}, [width, cellWidth, showLODLabels]);

// 垂直标尺 - 数字对齐到格线
const verticalRuler = useMemo(() => {
  if (!showLODLabels) return null;
  
  const markers: React.ReactNode[] = [];
  for (let lineNum = 10; lineNum <= height; lineNum += 10) {
    markers.push(
      <div
        key={lineNum}
        className="absolute text-[9px] font-medium text-muted-foreground"
        style={{ 
          // 数字中心对齐到格线位置
          top: lineNum * cellHeight,
          transform: 'translateY(-50%)',
          left: 2 
        }}
      >
        {lineNum}
      </div>
    );
  }
  return markers;
}, [height, cellHeight, showLODLabels]);
```

### 滚动区域重构

```typescript
return (
  <div className="flex flex-col h-full">
    {/* Controls Bar */}
    <div className="flex items-center justify-between p-2 ...">
      {/* ... 控制按钮 ... */}
    </div>

    {/* Canvas Area with Rulers */}
    <div className="flex-1 flex flex-col min-h-0 bg-muted/10 rounded-b-2xl">
      {/* Top: Corner + Horizontal Ruler */}
      <div className="flex shrink-0">
        <div className="w-6 h-5 bg-muted/60" /> {/* 左上角 */}
        <div 
          className="h-5 bg-muted/60 border-b border-border/40 relative overflow-hidden"
          style={{ width: canvasWidth * zoom }}
        >
          <div style={{ transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
            {horizontalRuler}
          </div>
        </div>
      </div>
      
      {/* Bottom: Vertical Ruler + Scrollable Canvas */}
      <div className="flex-1 flex min-h-0">
        {/* Vertical Ruler */}
        <div 
          className="w-6 bg-muted/60 border-r border-border/40 relative overflow-hidden shrink-0"
          style={{ height: canvasHeight * zoom }}
        >
          <div style={{ transform: `scaleY(${zoom})`, transformOrigin: 'top' }}>
            {verticalRuler}
          </div>
        </div>
        
        {/* Scrollable Canvas - 滚动条在这里 */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-auto"
          onWheel={handleWheel}
          style={{ cursor: 'crosshair' }}
        >
          <div style={{ 
            width: canvasWidth * zoom, 
            height: canvasHeight * zoom 
          }}>
            <div style={{ 
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: canvasWidth,
              height: canvasHeight,
            }}>
              {/* 主格线 + 画布内容 */}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
```

## 预期结果

1. **滚动条位置** - 水平滚动条在画布正下方，垂直滚动条在画布右侧
2. **标尺数字对齐** - 10/20/30 精准对齐到对应的主格线位置
3. **主格线** - 仅保留 10×10 的异色粗线，位置正确
4. **缩放功能** - 保留鼠标位置为中心的缩放功能

