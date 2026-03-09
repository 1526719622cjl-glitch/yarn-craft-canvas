

# 重建钩针引擎 & 棒针引擎 — 图解库 + AI 解析 + 跟织助手

## 概述

将现有的 Crochet Engine 和 Knitting Engine 重建为完整的**图解管理 + AI 解析 + 沉浸式跟织**系统，同时保留所有已有的针法知识库（49 种 JIS 符号、解析器、3D 组件等）。

---

## 数据层

### 新建数据库表

**`pattern_library`** — 图解卡片主表
```sql
id, user_id, category ('crochet'|'knitting'), title, description,
tags text[], status ('preparing'|'in_progress'|'completed'),
cover_image_url text, created_at, updated_at
```

**`pattern_files`** — 图解附件（图片/PDF）
```sql
id, pattern_id (FK), user_id, file_url text, file_type text,
sort_order int, created_at
```

**`pattern_annotations`** — 标注数据
```sql
id, pattern_file_id (FK), user_id, annotation_type ('pen'|'highlight'|'note'),
data jsonb, created_at
```

**`pattern_ai_parses`** — AI 解析结果
```sql
id, pattern_id (FK), user_id, parsed_steps jsonb,
anchor_regions jsonb, created_at
```

**`pattern_progress`** — 跟织进度
```sql
id, pattern_id (FK), user_id, current_step int, total_steps int,
step_timestamps jsonb, corrections jsonb, created_at, updated_at
```

### 存储桶

**`pattern-files`** — 存储图解图片和 PDF（public bucket + user RLS）

---

## 页面架构

### 路由变更

```text
/crochet → 钩针图解库（Library View）
/crochet/:id → 图解详情（Viewer + Annotator + AI Parse + Companion）
/knitting → 棒针图解库（Library View）  
/knitting/:id → 图解详情
```

### 共享组件（钩针/棒针复用）

| 组件 | 功能 |
|------|------|
| `PatternLibrary` | 卡片网格 + 搜索/筛选/标签 + 状态筛选 |
| `PatternCard` | 封面图 + 标题 + 标签 + 状态徽章 |
| `PatternViewer` | 图片/PDF 查看器 + 缩放平移 + 标注工具层 |
| `AnnotationToolbar` | 画笔、高亮、便签工具 |
| `AIParsePanel` | 侧边栏：AI 结构化步骤 + 原图锚点对比 |
| `ImmersiveCompanion` | 全屏跟织模式：单步导航 + 局部图 + 进度条 + 计时 |
| `StepCounter` | 侧边计数器（加减数字） |
| `PatternUploadDialog` | 上传图片/PDF + 元数据编辑 |

---

## 功能实现细节

### 1. 图解库 (Library)

- 顶部标签切换：全部 / 准备中 / 进行中 / 已完成
- 搜索栏：按标题、标签模糊搜索
- 卡片操作：点击进入详情，长按/右键编辑标签/状态
- 右上角 "+" 按钮上传新图解

### 2. 图解查看器 & 标注 (Viewer)

- 使用 `react-zoom-pan-pinch` 实现图片缩放
- 标注工具层：Canvas overlay 实现画笔/高亮
- 便签：绝对定位的可拖拽便签组件
- 标注数据存储为 JSON（笔画路径、位置、颜色）

### 3. AI 解析 (AI Parser)

- 使用 Lovable AI（`google/gemini-2.5-pro`，支持图片输入）
- Edge function `parse-chart-image`：接收图片 URL，返回结构化步骤
- 每个步骤包含：行号、指令文本、原图对应区域坐标（anchor region）
- 双视图：左侧原图（高亮当前区域），右侧 AI 解析步骤列表

### 4. 沉浸式跟织助手 (Companion)

- **单步模式**：一次显示一行指令 + 原图局部截图
- **导航**：下一步/上一步按钮，键盘快捷键支持
- **打卡音效**：使用 Web Audio API 播放短促完成音（可关闭）
- **进度条**：`Progress` 组件显示百分比
- **剩余时间**：基于每步平均耗时动态估算
- **修正功能**：点击"修正"进入编辑模式，修改存入 corrections

### 5. 辅助工具

- **侧边计数器**：固定在右侧的浮动组件，+/- 按钮
- **UI 风格**：保持现有米色/浅灰治愈系美学，圆角卡片

---

## Edge Function

**`supabase/functions/parse-chart-image/index.ts`**
- 接收 `{ imageUrl, category }` 
- 调用 Lovable AI（gemini-2.5-pro）进行图像分析
- 系统提示词包含钩针/棒针术语知识
- 返回 `{ steps: [{ row, instruction, anchorRegion }] }`

---

## i18n

在 `translations.ts` 添加所有新 UI 字符串的中英文翻译（约 60+ 新 key）。

---

## 文件清单

| 文件 | 操作 |
|------|------|
| `supabase/migrations/xxx.sql` | 新建 5 张表 + storage bucket + RLS |
| `supabase/functions/parse-chart-image/index.ts` | AI 图解解析 |
| `src/pages/CrochetEngine.tsx` | 重写为图解库入口 |
| `src/pages/KnittingEngine.tsx` | 重写为图解库入口 |
| `src/pages/PatternDetail.tsx` | 新建：图解详情页（查看器+AI+跟织） |
| `src/components/pattern/PatternLibrary.tsx` | 新建：卡片网格 |
| `src/components/pattern/PatternCard.tsx` | 新建：图解卡片 |
| `src/components/pattern/PatternViewer.tsx` | 新建：查看器+标注 |
| `src/components/pattern/AnnotationToolbar.tsx` | 新建：标注工具 |
| `src/components/pattern/AIParsePanel.tsx` | 新建：AI 解析侧栏 |
| `src/components/pattern/ImmersiveCompanion.tsx` | 新建：跟织助手 |
| `src/components/pattern/StepCounter.tsx` | 新建：侧边计数器 |
| `src/components/pattern/PatternUploadDialog.tsx` | 新建：上传对话框 |
| `src/hooks/usePatternLibrary.ts` | 新建：CRUD hook |
| `src/hooks/usePatternProgress.ts` | 新建：进度追踪 hook |
| `src/App.tsx` | 添加 `:id` 路由 |
| `src/i18n/translations.ts` | 添加新翻译 key |
| `src/components/layout/Sidebar.tsx` | 更新导航描述 |

### 保留的现有文件（不删除）
- `src/lib/crochetStitchTypes.ts` — 49 种 JIS 针法定义
- `src/lib/enhancedCrochetParser.ts` — 文本解析器
- `src/lib/crochetPathGenerator.ts` — 3D 顶点生成
- `src/components/3d/*` — 3D 线框/管状组件
- `src/components/crochet/*` — JIS 符号组件
- `src/store/useYarnCluesStore.ts` — 保留 knitting/crochet store 数据

---

## 实现顺序

1. 数据库迁移（表 + 存储桶 + RLS）
2. 共享组件：PatternCard, PatternLibrary, PatternUploadDialog
3. 重写 CrochetEngine.tsx / KnittingEngine.tsx 为库页面
4. PatternDetail 页面：查看器 + 标注
5. AI 解析 Edge Function + AIParsePanel
6. ImmersiveCompanion 跟织助手
7. i18n 翻译补全

