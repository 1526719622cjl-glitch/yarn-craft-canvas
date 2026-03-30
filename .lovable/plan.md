# 多项修改：样片清空位置、定位编织保存提示、图解标注增强

## 修改清单

### 1. 样片实验室清空按钮移到右上角 + 清空后数字归零

**文件**: `src/pages/SwatchLab.tsx`

- 把清空按钮从底部（第585行）移到页面头部右上角 undo/redo 按钮旁边
- 清空时所有数值设为 0 而非当前的默认值（`preWashWidth: 0, preWashHeight: 0, stitchesPreWash: 0, rowsPreWash: 0` 等）
- `projectPlan` 也全归零

### 2. 定位编织前强制先保存

**文件**: `src/pages/PixelGenerator.tsx`

- 点击"开始定位编织"按钮时（第1586行），检查 `activeDesignId` 是否存在
- 若未保存（无 `activeDesignId`），弹出提示"请先保存设计到图库，以便保存编织进度"并阻止进入，直接弹出保存按钮，然后弹出开始定位编织按钮，可直接进入
- 可用 toast 提示或 confirm 弹窗

### 3. 图解标注工具增强

**文件**: `src/components/pattern/AnnotationToolbar.tsx` + `src/components/pattern/PatternViewer.tsx`

#### 3a. 颜色选择器

- 在 `AnnotationToolbar` 中新增颜色选择，对画笔/荧光笔/文字工具生效
- 添加一个小的颜色 input（`<input type="color">`）或几个预设色块
- `PatternViewer` 里用选定颜色渲染 stroke、highlight、text

#### 3b. 空文本自动清除

- `PatternViewer` 中文字编辑 `onBlur` 时，若 `txt.text` 为空，从 annotations 中移除该条目

#### 3c. 橡皮擦改为"指哪擦哪"

- 当前橡皮擦是一键清空全部。改为：
  - 选中"橡皮擦"工具后，点击某个 stroke/highlight/note/text 可单独删除它
  - 需要做命中检测：点击点与 stroke 路径的距离、是否在 highlight rect 内、是否点到 note/text 元素
- 对 SVG 元素加 `pointerEvents` 和 `onClick`，在 eraser 模式下删除被点击的元素

#### 3d. 前进/后退（undo/redo）

- 在 `PatternViewer` 中维护 annotation 操作历史栈
- 每次 `updateAnnotations` 时 push 当前状态到 undo 栈
- 工具栏增加 Undo/Redo 按钮

#### 3e. 一键清空

- 保留清空功能，但把橡皮擦图标改为"一键清空"的独立按钮（如 `Trash2` 图标）
- 原橡皮擦图标保留用于"指哪擦哪"

#### 3f. 保存功能 — 标注 + 计数器

- 标注保存已有（`saveAnnotations` in `PatternDetail`）
- 计数器（`StepCounter`）当前是纯本地 state，不保存。需要：
  - 给 `StepCounter` 加 `patternId` prop
  - 使用 `usePatternProgress` hook 或 localStorage 持久化计数器值
  - 进入 `PatternDetail` 时加载已保存的计数器值

### 技术细节

**AnnotationToolbar** 新增 props：

- `color: string` + `onColorChange: (color: string) => void`
- 增加 `onUndo` / `onRedo` / `canUndo` / `canRedo` props

**PatternViewer** 新增状态：

- `annotationColor: string`（默认 `#6366f1`）
- `undoStack: PatternAnnotationData[]` / `redoStack: PatternAnnotationData[]`
- 每个 stroke 和 highlight 增加 `color` 属性存储（扩展接口）
- eraser 模式：SVG 元素在 `tool === 'eraser'` 时 `pointerEvents: 'auto'` + `cursor: crosshair`，点击时从 annotations 中按 index 删除

**StepCounter** 改造：

- 接收 `patternId` prop
- 用 `usePatternProgress(patternId)` 加载/保存
- `count` 映射到 `progress.current_step`

## 涉及文件


| 步骤  | 文件                                                                                         |
| --- | ------------------------------------------------------------------------------------------ |
| 1   | `src/pages/SwatchLab.tsx`                                                                  |
| 2   | `src/pages/PixelGenerator.tsx`                                                             |
| 3   | `src/components/pattern/AnnotationToolbar.tsx`, `src/components/pattern/PatternViewer.tsx` |
| 4   | `src/components/pattern/StepCounter.tsx`, `src/pages/PatternDetail.tsx`                    |


## 实现顺序

1. 样片清空移至右上角 + 归零
2. 定位编织保存前提示
3. 标注工具全面增强（颜色/橡皮擦/undo-redo/清空/空文本清除）
4. 计数器持久化