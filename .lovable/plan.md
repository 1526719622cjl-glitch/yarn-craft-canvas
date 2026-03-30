

# 定位编织交互增强：点击选行 + 高亮标记更醒目

## 问题

1. **无法通过点击行来选择当前行** — 目前只能用底部左右箭头逐行切换，不能直接点击网格中的某一行跳转
2. **高亮标记不够明显** — 当前高亮只是 `2px solid primary` 描边 + `bg-primary/20` 半透明叠加，在密集像素图上很难看清

## 修改方案

### 1. 点击行号或行区域跳转到该行
文件：`src/components/pixel/PixelKnittingGuide.tsx`

- 给每一行的外层 `div`（第150行）添加 `onClick` 事件，点击任意行时 `setCurrentRow(y)` 跳转到该行
- 给非当前行添加 `cursor: pointer`，提示用户可点击
- 行号标签也参与点击跳转
- 当前行的格子点击仍保留原有的"高亮标记"功能，不冲突

### 2. 高亮标记更醒目
文件：`src/components/pixel/PixelKnittingGuide.tsx`

- 描边从 `2px solid primary` 改为 `3px solid` 使用高对比色（如红色 `#FF0000` 或亮黄 `#FFD700`）
- 叠加层从 `bg-primary/20` 改为更明显的视觉效果：
  - 使用对角线条纹或棋盘格 pattern（CSS background-image）
  - 或者用更高不透明度 + 对比色叠加（如 `bg-yellow-400/40`）
- 在高亮格子中央加一个小圆点或勾号标记，确保即使颜色相近也能看到标记

## 涉及文件
- `src/components/pixel/PixelKnittingGuide.tsx`

