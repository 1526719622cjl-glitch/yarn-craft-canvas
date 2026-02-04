
# Pixel Generator 综合修复计划

## ✅ 已完成实现

### 问题 1: 导入图片尺寸不一致 ✅
**修复方案**: 
- 创建 `processImageWithDimensions` 函数，直接传入尺寸参数
- `handleCanvasSizeConfirm` 现在直接调用此函数，绕过状态依赖问题
- 不再依赖 useEffect 监听 uploadedImage 变化

### 问题 2: 鼠标滚轮缩放时画布漂移 ✅
**修复方案**:
- 使用 `InfiniteCanvas` 组件（内置 `react-zoom-pan-pinch` 的 TransformWrapper）
- 支持鼠标位置为中心的缩放
- 空格键拖拽平移
- 自动 Fit-to-View 功能

### 问题 3: 画布设置需要点击设置图标才能看到 ✅
**修复方案**:
- 删除 `showSettings` 状态和设置按钮
- 画布尺寸输入框始终显示在左侧面板中
- Stitch Type 选择器下方直接展示

### 问题 4: 导入后需要"定比缩放"功能 ✅
**修复方案**:
- 新增 `canvasScale` 状态和 `scaleCanvas` 函数
- 使用 nearest-neighbor 算法缩放现有的 `pixelGrid`
- 保留已编辑的格子颜色
- 添加滑块 UI 控件（50%-200%）

---

## 修改的文件

| 文件 | 修改内容 |
|------|---------|
| `src/pages/PixelGenerator.tsx` | 1. 删除 showSettings/previewZoom 状态<br>2. 添加 canvasScale 状态<br>3. 创建 processImageWithDimensions 函数<br>4. 创建 scaleCanvas 函数<br>5. 移除 handleWheel 和 Ruler 组件<br>6. 使用 InfiniteCanvas 替代手动 CSS scale<br>7. 始终显示画布尺寸设置<br>8. 添加 Scale Canvas 滑块 UI |

---

## 结果

1. **导入尺寸一致**: CanvasSizeDialog 选择的尺寸准确应用到 Preview
2. **专业缩放体验**: 鼠标滚轮缩放以鼠标位置为中心，画布不再漂移
3. **直观的设置访问**: 画布宽高设置始终可见
4. **定比缩放功能**: 导入后可按比例调整画布大小，保留编辑内容
