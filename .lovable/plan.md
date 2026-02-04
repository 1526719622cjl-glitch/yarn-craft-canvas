
# Pixel Generator 综合修复计划

## 问题分析

### 问题 1: 导入图片尺寸不一致
**根本原因**: 在 `CanvasSizeDialog` 中选择的尺寸被正确存储到 `importedDimensions`，但 `processImage` 在 `useEffect` 中被触发时，`importedDimensions` 可能还没有被更新（React 状态更新是异步的）。

**代码追踪**:
1. `handleCanvasSizeConfirm` 设置 `importedDimensions` 和 `uploadedImage`
2. `useEffect` 监听 `uploadedImage` 变化，调用 `processImage`
3. 但 `importedDimensions` 作为 dependency 在 `processImage` 的 useCallback 中，导致闭包问题

**修复方案**: 
- 将 `importedDimensions` 直接传递给 `processImage`，而不是依赖状态
- 或者在 `handleCanvasSizeConfirm` 中直接调用 `processImage` 并传入尺寸

### 问题 2: 鼠标滚轮缩放时画布漂移
**根本原因**: 当前的 `handleWheel` 只调整 `previewZoom` 的数值，使用 CSS `transform: scale()` 进行缩放。缩放原点是 `origin-top-left`，导致缩放时内容向左上角收缩或向右下角扩展，用户看不到主图。

**修复方案**:
- 使用 `react-zoom-pan-pinch` 的 `TransformWrapper` 代替手动 CSS scale
- 设置 `wheel.activationKeys` 为空（允许直接滚轮缩放）
- 配置 `centerZoomedOut={true}` 保持缩放后居中
- 用户选择了"Zoom to cursor"，使用 `wheel.mode = "smooth"` 实现鼠标位置为中心的缩放

### 问题 3: 画布设置需要点击设置图标才能看到
**根本原因**: 尺寸设置被包裹在 `showSettings && (...)` 条件渲染中，默认 `showSettings = false`。

**修复方案**:
- 用户选择"Always visible"
- 删除 `showSettings` 状态和设置按钮
- 直接将尺寸输入框移出条件渲染块，始终显示

### 问题 4: 导入后需要"定比缩放"功能
**用户需求**: 导入图片后，可以按比例放大/缩小画布（保持长宽比），同时保留已编辑的格子颜色。

**修复方案**:
- 添加一个"Scale Canvas"滑块/输入框
- 使用 nearest-neighbor 算法缩放现有的 `pixelGrid`
- 保持长宽比例，用户调整 width 时自动计算 height

---

## 实现步骤

### 第一步: 修复图片导入尺寸一致性

**文件**: `src/pages/PixelGenerator.tsx`

修改 `handleCanvasSizeConfirm` 和 `processImage` 的调用方式：

```typescript
// 改为直接传参调用 processImage，而不是依赖 useEffect
const handleCanvasSizeConfirm = useCallback((canvasWidth: number, canvasHeight: number) => {
  if (pendingCroppedImage) {
    // 直接处理图片，使用传入的尺寸
    processImageWithDimensions(pendingCroppedImage.url, canvasWidth, canvasHeight);
    setPendingCroppedImage(null);
  }
}, [pendingCroppedImage]);

// 新函数：带尺寸参数的处理
const processImageWithDimensions = useCallback((imageUrl: string, targetWidth: number, targetHeight: number) => {
  // ... 处理逻辑，直接使用 targetWidth/targetHeight
}, [colorCount, useDithering, ...]);
```

### 第二步: 使用 TransformWrapper 实现专业缩放

**文件**: `src/pages/PixelGenerator.tsx`

替换当前的 CSS scale 方案：

```typescript
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

// 在 Grid 区域使用 TransformWrapper
<TransformWrapper
  ref={transformRef}
  initialScale={1}
  minScale={0.1}
  maxScale={5}
  centerOnInit={true}
  wheel={{ 
    step: 0.1,
    smoothStep: 0.001,  // 平滑滚动
  }}
  panning={{ disabled: false }}
  onTransformed={(ref) => setCurrentZoom(ref.state.scale)}
>
  {({ zoomIn, zoomOut, resetTransform, centerView }) => (
    <>
      {/* 缩放控制栏 */}
      <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl mb-3">
        <Button variant="ghost" size="icon" onClick={() => zoomOut()}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Slider value={[currentZoom * 100]} ... />
        <Button variant="ghost" size="icon" onClick={() => zoomIn()}>
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => centerView(1)}>
          <Maximize className="w-4 h-4" />
        </Button>
      </div>
      
      <TransformComponent wrapperStyle={{ width: '100%', height: '100%', maxHeight: 600 }}>
        {/* Grid content */}
      </TransformComponent>
    </>
  )}
</TransformWrapper>
```

### 第三步: 始终显示画布尺寸设置

**文件**: `src/pages/PixelGenerator.tsx`

1. 删除 `showSettings` 状态
2. 删除设置图标按钮
3. 将尺寸输入框直接放在上传按钮下方

```typescript
// 删除这些
const [showSettings, setShowSettings] = useState(false);

// 删除设置按钮
// <Button onClick={() => setShowSettings(!showSettings)}>

// 直接显示尺寸设置，不需要条件判断
<div className="space-y-4">
  {/* Stitch Type */}
  <StitchTypeSelector ... />
  
  {/* Canvas Dimensions - 始终可见 */}
  <div className="space-y-3">
    <Label className="text-sm font-medium">Canvas Dimensions (stitches)</Label>
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Width</Label>
        <Input type="number" value={customGridWidth} ... />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Height</Label>
        <Input type="number" value={...} ... />
      </div>
    </div>
  </div>
  
  {/* Dithering toggle */}
  {/* Create Empty Canvas button */}
</div>
```

### 第四步: 添加定比缩放功能

**文件**: `src/pages/PixelGenerator.tsx`

添加画布缩放控件和逻辑：

```typescript
// 新增状态
const [canvasScale, setCanvasScale] = useState(100); // 百分比

// 缩放函数 - 使用 nearest-neighbor 保留编辑
const scaleCanvas = useCallback((newScale: number) => {
  if (pixelGrid.length === 0) return;
  
  const scaleFactor = newScale / 100;
  const newWidth = Math.round(gridWidth * scaleFactor);
  const newHeight = Math.round(gridHeight * scaleFactor);
  
  // 最小限制
  if (newWidth < 10 || newHeight < 10) return;
  
  // Nearest-neighbor 缩放
  const newGrid: PixelCell[] = [];
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      // 映射到原始坐标
      const srcX = Math.floor(x / scaleFactor);
      const srcY = Math.floor(y / scaleFactor);
      const srcCell = pixelGrid.find(c => c.x === srcX && c.y === srcY);
      newGrid.push({ 
        x, 
        y, 
        color: srcCell?.color || '#FDFBF7' 
      });
    }
  }
  
  setGridDimensions(newWidth, newHeight);
  setPixelGrid(newGrid);
  setCanvasScale(100); // 重置滑块
}, [pixelGrid, gridWidth, gridHeight]);

// UI - 在画布设置区域添加
{pixelGrid.length > 0 && (
  <div className="space-y-2 border-t border-border/30 pt-4">
    <div className="flex items-center justify-between">
      <Label className="text-sm">Scale Canvas</Label>
      <span className="text-xs text-muted-foreground">{canvasScale}%</span>
    </div>
    <div className="flex gap-2">
      <Slider
        value={[canvasScale]}
        onValueChange={([val]) => setCanvasScale(val)}
        min={50}
        max={200}
        step={10}
        className="flex-1"
      />
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => scaleCanvas(canvasScale)}
        disabled={canvasScale === 100}
        className="rounded-xl"
      >
        Apply
      </Button>
    </div>
    <p className="text-[10px] text-muted-foreground">
      {Math.round(gridWidth * canvasScale / 100)} × {Math.round(gridHeight * canvasScale / 100)} stitches
    </p>
  </div>
)}
```

---

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/pages/PixelGenerator.tsx` | 1. 修复导入尺寸逻辑<br>2. 替换为 TransformWrapper 缩放<br>3. 始终显示尺寸设置<br>4. 添加定比缩放功能 |

---

## 技术细节

### TransformWrapper 配置
```typescript
<TransformWrapper
  ref={transformRef}
  initialScale={1}
  minScale={0.1}
  maxScale={5}
  centerOnInit={true}
  limitToBounds={false}
  wheel={{ 
    step: 0.1,
    smoothStep: 0.001,
  }}
  panning={{ velocityDisabled: true }}
  onTransformed={(ref) => setCurrentZoom(ref.state.scale)}
>
```

### 直接调用 processImage 的逻辑
```typescript
// 在 handleCanvasSizeConfirm 中直接处理
const handleCanvasSizeConfirm = useCallback((canvasWidth: number, canvasHeight: number) => {
  if (pendingCroppedImage) {
    const imageUrl = pendingCroppedImage.url;
    setPendingCroppedImage(null);
    
    // 直接处理，不依赖 useEffect
    const img = new Image();
    img.onload = () => {
      // 使用 canvasWidth, canvasHeight 作为目标尺寸
      setGridDimensions(canvasWidth, canvasHeight);
      // ... 后续处理
    };
    img.src = imageUrl;
  }
}, [...]);
```

---

## 预期结果

1. **导入尺寸一致**: 在 CanvasSizeDialog 选择的尺寸会准确应用到 Preview 中
2. **专业缩放体验**: 鼠标滚轮缩放以鼠标位置为中心，画布不会漂移丢失
3. **直观的设置访问**: 画布宽高设置始终可见，无需点击设置图标
4. **定比缩放功能**: 导入后可以按比例调整画布大小，保留已编辑的颜色

---

## 关于退还 Credit 的说明

抱歉，我无法直接退还 Credit，这需要通过 Lovable 的客服渠道处理。如果您认为之前的指令没有正确执行，建议您联系 Lovable 支持团队。
