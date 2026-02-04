

# 画布简化方案 - 滚动条导航 + 鼠标缩放

## 问题分析

当前的 `InfiniteCanvas` 使用 `react-zoom-pan-pinch` 实现了一个"无限画布"模式，会显示：
- 棋盘格背景（表示透明区域）
- 允许拖拽平移到画布外的空白区域
- 标尺随画布移动

这与您期望的简洁界面不符。

## 用户需求

1. **只显示主画布** - 不要空白背景
2. **滚动条导航** - 通过浏览器原生滚动条移动画布
3. **鼠标缩放保留** - 滚轮缩放以鼠标位置为中心
4. **禁用拖拽** - 不能通过鼠标拖拽移动画布

## 修复方案

### 文件: `src/components/pixel/InfiniteCanvas.tsx`

完全重构为简化版本：

1. **移除 `TransformWrapper`** - 不再使用 `react-zoom-pan-pinch` 的拖拽功能
2. **使用 CSS scale + overflow-auto** - 通过 CSS transform 实现缩放，浏览器滚动条实现平移
3. **鼠标滚轮缩放** - 自定义 `onWheel` 事件，计算鼠标位置并调整滚动偏移
4. **移除棋盘格背景** - 简洁的纯色背景

### 核心代码变更

```typescript
// 移除 TransformWrapper，使用简单的 overflow-auto 容器
<div 
  ref={containerRef}
  className="flex-1 overflow-auto bg-muted/10 rounded-b-2xl"
  onWheel={handleWheel}
>
  <div 
    style={{ 
      transform: `scale(${zoom})`,
      transformOrigin: 'top left',
      width: canvasWidth,
      height: canvasHeight,
    }}
  >
    {/* Rulers and Grid */}
  </div>
</div>

// 鼠标位置缩放逻辑
const handleWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault();
  const container = containerRef.current;
  if (!container) return;
  
  // 获取鼠标在容器中的位置
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left + container.scrollLeft;
  const mouseY = e.clientY - rect.top + container.scrollTop;
  
  // 计算缩放前后的鼠标对应画布坐标
  const oldZoom = zoom;
  const delta = e.deltaY > 0 ? 0.9 : 1.1; // 缩小/放大
  const newZoom = Math.max(0.1, Math.min(5, oldZoom * delta));
  
  // 计算新的滚动位置以保持鼠标指向的点不变
  const canvasX = mouseX / oldZoom;
  const canvasY = mouseY / oldZoom;
  const newScrollX = canvasX * newZoom - (e.clientX - rect.left);
  const newScrollY = canvasY * newZoom - (e.clientY - rect.top);
  
  setZoom(newZoom);
  
  // 延迟设置滚动位置（等待 scale 更新）
  requestAnimationFrame(() => {
    container.scrollLeft = newScrollX;
    container.scrollTop = newScrollY;
  });
}, [zoom]);
```

### 布局结构

```typescript
<div className="flex flex-col h-full">
  {/* Controls Bar - 缩放控制 */}
  <div className="flex items-center justify-between p-2 border-b">
    <Button onClick={zoomIn}>+</Button>
    <Slider value={zoom} ... />
    <Button onClick={zoomOut}>-</Button>
    <Button onClick={fitToView}>Fit</Button>
  </div>

  {/* Canvas Area - 简单滚动容器 */}
  <div 
    ref={containerRef}
    className="flex-1 overflow-auto bg-muted/10"
    onWheel={handleWheel}
  >
    {/* 缩放后的内容 */}
    <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
      {/* Rulers */}
      <div className="flex">
        <div className="w-6" /> {/* 左上角空白 */}
        <div className="h-5">{horizontalRuler}</div>
      </div>
      <div className="flex">
        <div className="w-6">{verticalRuler}</div>
        <div>{children}</div> {/* Grid content */}
      </div>
    </div>
  </div>
</div>
```

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/pixel/InfiniteCanvas.tsx` | 1. 移除 `react-zoom-pan-pinch`<br>2. 使用 `overflow-auto` 容器<br>3. 自定义 `onWheel` 实现鼠标位置缩放<br>4. 移除棋盘格背景<br>5. 标尺改为固定位置 |

## 预期结果

1. **只显示画布** - 无空白背景，无棋盘格
2. **滚动条导航** - 放大后通过浏览器滚动条移动
3. **鼠标缩放** - 滚轮缩放以鼠标位置为中心
4. **无拖拽** - 不能通过鼠标拖拽移动画布

## 技术细节

鼠标位置缩放的数学原理：

```
缩放前: 
  - 鼠标在容器中的位置 = (mouseX, mouseY)
  - 对应画布坐标 = (mouseX / oldZoom, mouseY / oldZoom)

缩放后:
  - 画布坐标在新缩放下的位置 = (canvasX * newZoom, canvasY * newZoom)
  - 需要的滚动偏移 = 新位置 - 鼠标在视口中的位置
```

这样确保鼠标指向的那个像素点在缩放后仍然在鼠标下方。

