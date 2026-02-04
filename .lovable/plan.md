
# 画布缩放修复 - 左上角起始 + 鼠标为中心缩放

## 问题分析

当前 `InfiniteCanvas` 组件的配置:
- `centerOnInit={true}` - 画布初始化时居中显示，导致周围出现空白区域
- 使用 `centerView(scale)` 进行 fitToView，会将内容居中
- 缩放后自动调整位置，导致用户看到"不存在的像素点"

## 用户需求

1. **画布从左上角开始** - 不显示空白区域，类似之前的版本
2. **鼠标位置为缩放中心** - 缩放时以鼠标指向的位置为焦点
3. **平滑拖拽** - 支持拖拽平移画布

## 修复方案

### 文件: `src/components/pixel/InfiniteCanvas.tsx`

1. **取消初始居中**
   - `centerOnInit={false}` - 画布从左上角开始
   - 初始位置设为 (0, 0)
   
2. **鼠标位置缩放**
   - `react-zoom-pan-pinch` 默认已支持鼠标位置缩放
   - 确保不调用 `centerView()` 覆盖缩放行为

3. **修改 fitToView 逻辑**
   - 使用 `setTransform(x, y, scale)` 代替 `centerView()`
   - 保持内容在左上角对齐

4. **移除不必要的边距**
   - 减少 `contentStyle` 中的额外 padding (48px → 0)
   - 标尺直接贴边显示

### 关键代码变更

```typescript
// TransformWrapper 配置
<TransformWrapper
  ref={transformRef}
  initialScale={1}           // 初始 100% 缩放
  initialPositionX={0}       // 从左上角开始
  initialPositionY={0}
  minScale={0.05}
  maxScale={5}
  centerOnInit={false}       // 不居中
  limitToBounds={false}      // 允许拖拽超出边界
  wheel={{ step: 0.05 }}     // 默认已是鼠标位置缩放
  panning={{ disabled: false }}
  onTransformed={handleTransform}
  doubleClick={{ disabled: true }}
>

// fitToView 修改为左上角对齐
const fitToView = useCallback(() => {
  if (!containerRef.current || !transformRef.current) return;
  
  const container = containerRef.current;
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  
  const scaleX = containerWidth / canvasWidth;
  const scaleY = containerHeight / canvasHeight;
  const scale = Math.min(scaleX, scaleY, 1);
  
  // 设置为左上角对齐，不居中
  transformRef.current.setTransform(0, 0, scale);
  setCurrentZoom(scale);
}, [canvasWidth, canvasHeight]);

// TransformComponent 移除额外边距
<TransformComponent
  wrapperStyle={{ width: '100%', height: '100%' }}
  contentStyle={{ width: canvasWidth, height: canvasHeight }}
>
```

### 布局调整

```typescript
// 主内容区域直接从 (0,0) 开始
<div 
  className="relative"
  style={{ 
    width: canvasWidth,
    height: canvasHeight,
  }}
>
  {/* Grid 内容 */}
  {children}
  
  {/* 叠加标尺（固定在视口边缘，不随画布移动） */}
</div>
```

## 修改文件

| 文件 | 修改内容 |
|------|---------|
| `src/components/pixel/InfiniteCanvas.tsx` | 1. centerOnInit=false<br>2. initialPosition=(0,0)<br>3. fitToView 使用 setTransform<br>4. 移除内容区额外边距 |

## 预期结果

1. **左上角起始** - 画布内容从左上角开始显示，不再有空白区域
2. **鼠标位置缩放** - 滚轮缩放时以鼠标所在位置为中心
3. **平滑拖拽** - 按住鼠标可自由拖拽画布
4. **无漂移** - 缩放后画布不会移出视野
