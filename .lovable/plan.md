

# 多项UI修改：项目名称、计数器、中文化、Logo、描述文案

## 修改清单

### 1. 项目规划器加项目名称 — `SwatchLab.tsx` + `translations.ts`
在项目规划器区块（第524行）的"目标尺寸"上方添加一个"项目名称"文本输入框。需要在 store 或本地 state 中存储 `projectName`，并传给 `SwatchReportGenerator`。

### 2. 图解库页面加计数器 — `PatternLibrary.tsx`
当前 `StepCounter` 只在 `PatternDetail` 中显示。在 `PatternLibrary` 组件中也引入 `StepCounter`，使其在图解库列表页也可见。加大计数器样式使其更醒目（宽度从 `w-16` 改为 `w-20`，数字更大）。

### 3. 图片图解标注功能修复 — `PatternDetail.tsx`
当前代码第202-209行：`isImageFile` 为 true 时使用 `PatternViewer`（支持标注），这应该已经可以工作。检查 `PatternViewer` 的 `onAnnotationChange` 是否正确传递。看代码逻辑是正确的，可能问题在于 `TransformWrapper` 的缩放与标注手势冲突——当选择标注工具时需要禁用缩放拖拽。修改 `PatternViewer` 使 `tool !== 'none'` 时禁用 `TransformWrapper` 的 panning。

### 4. 删除英文版，只保留中文 — 多文件
- 删除 `LanguageSwitcher.tsx`
- 从 `Sidebar.tsx` 移除 LanguageSwitcher 导入和使用
- 简化 `translations.ts`：移除所有 `en` 值，`getTranslation` 直接返回 `zh`
- 简化 `useI18n.tsx`：移除 locale 切换逻辑，硬编码 `zh`
- 检查代码中残留的英文硬编码字符串（如 toast 消息、placeholder 等）改为中文

### 5. Yarn Clues Logo — `Sidebar.tsx`
替换当前 `Sparkles` 图标为自定义 SVG Logo：简约风格，包含毛线团元素（一个圆形线团 + 一根线头），与现有设计风格一致。创建 `YarnCluesLogo` 组件。

### 6. 像素生成器描述修改 — `translations.ts`
`nav.pixelGenerator.desc`：`图转针格` → `像素图生成与设计，定位辅助编织`
`pixel.subtitle`：`密度感知转换，K-Means 量化 & 对称工具` → `像素图生成与设计，定位辅助编织`

### 7. 图解库描述修改 — `translations.ts`
`nav.crochetEngine.desc`：`图解库 & AI 解析` → `图解管理与记录`
`nav.knittingEngine.desc`：`图解库 & 跟织助手` → `图解管理与记录`
`pattern.librarySubtitle`：`管理你的图解、AI 解析、沉浸式跟织` → `图解管理与记录`

### 8. 钩针Logo修改 — `CrochetHookIcon.tsx`
当前SVG看起来像伞。重新绘制：一个更明显的钩针形状——笔直的针身 + 顶部明显的弯钩，类似字母 J 的造型。

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 简化 i18n 为纯中文 + 修改描述文案 | translations.ts, useI18n.tsx |
| 2 | 删除 LanguageSwitcher，更新 Sidebar | LanguageSwitcher.tsx, Sidebar.tsx |
| 3 | 新建 YarnCluesLogo + 修改钩针图标 | 新组件, CrochetHookIcon.tsx, Sidebar.tsx |
| 4 | 项目规划器加项目名称 | SwatchLab.tsx, SwatchReportGenerator.tsx |
| 5 | 图解库加计数器 + 加大样式 | PatternLibrary.tsx, StepCounter.tsx |
| 6 | 修复图片标注（禁用缩放冲突） | PatternViewer.tsx |

