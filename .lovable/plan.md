

# 钩针/棒针图解库 — 修复与增强计划

## 问题分析

从代码和日志中发现以下问题：

1. **命名问题**：侧边栏显示"钩针引擎/棒针引擎"，应改为"钩针图解库/棒针图解库"
2. **状态标签**：当前为"准备中/进行中/已完成"，需改为"未织/进行中/已完成"
3. **PDF 解析失败**：日志显示 `Unsupported image format for URL: ...pdf`，AI Gateway 仅支持 PNG/JPEG/WebP/GIF
4. **缺少标注工具**：PatternViewer 没有画笔/高亮/便签功能
5. **上传时缺少状态选择和线材关联**
6. **计数器位置**：应该只在沉浸式模式内显示，而非全局固定

---

## 修复方案

### 1. 更新翻译（i18n）

**文件**: `src/i18n/translations.ts`

```text
修改:
- nav.crochetEngine: "钩针引擎" → "钩针图解库" / "Crochet Library"
- nav.knittingEngine: "棒针引擎" → "棒针图解库" / "Knitting Library"
- pattern.status.preparing: "准备中" → "未织" / "Not Started"
```

### 2. 修复 PDF 不支持的问题

**问题根源**: AI Gateway 仅接受图片 URL，PDF 无法直接解析。

**方案**:
- 上传时检测文件类型
- 若为 PDF，提示用户仅图片可用于 AI 解析
- AI 解析按钮仅在当前文件为图片时启用
- 在 PatternDetail 页面显示 PDF 时使用 `<iframe>` 或提示下载

**文件**: `src/pages/PatternDetail.tsx`, `src/components/pattern/AIParsePanel.tsx`

### 3. 上传对话框增强

**文件**: `src/components/pattern/PatternUploadDialog.tsx`

- 添加初始状态选择器（未织/进行中/已完成）
- 添加可选的线材关联下拉框（从 yarn_entries 加载）
- 关联后自动填充小样数据

### 4. 添加标注工具层

**新建文件**: `src/components/pattern/AnnotationToolbar.tsx`

功能:
- 画笔工具（Canvas 绘制）
- 高亮工具（半透明矩形）
- 便签工具（可拖拽的 div）
- 保存标注到 `pattern_annotations` 表

**修改**: `src/components/pattern/PatternViewer.tsx`
- 添加 Canvas overlay 层
- 集成标注工具栏

### 5. 优化沉浸式入口和计数器

**修改**: `src/pages/PatternDetail.tsx`
- 移除全局 StepCounter，仅在 ImmersiveCompanion 内显示
- 当有图片但无步骤时，显示"开始 AI 解析"按钮更醒目

**修改**: `src/components/pattern/ImmersiveCompanion.tsx`
- 将 StepCounter 集成到沉浸模式侧边

### 6. 文件类型检测与显示

**修改**: `src/pages/PatternDetail.tsx`

```tsx
// 检测当前文件是否为图片
const isImage = currentFile?.file_type === 'image' || 
  currentFile?.file_url?.match(/\.(jpg|jpeg|png|webp|gif)$/i);

// PDF 显示处理
{isPDF ? (
  <iframe src={currentFile.file_url} className="w-full h-full" />
) : (
  <PatternViewer imageUrl={currentFile.file_url} ... />
)}
```

---

## 实现优先级

| 优先级 | 任务 | 文件 |
|--------|------|------|
| P0 | 更新翻译（命名+状态） | translations.ts |
| P0 | 修复 PDF 显示问题 | PatternDetail.tsx |
| P1 | AI 解析仅对图片启用 | AIParsePanel.tsx |
| P1 | 上传时添加状态选择+线材关联 | PatternUploadDialog.tsx |
| P2 | 计数器移入沉浸模式 | ImmersiveCompanion.tsx, PatternDetail.tsx |
| P2 | 添加简单标注工具 | PatternViewer.tsx, AnnotationToolbar.tsx |

---

## 技术细节

### 状态值保持不变
数据库中状态仍为 `preparing`/`in_progress`/`completed`，仅 UI 显示文字变更。

### 线材关联字段
创建图解时可选择线材，存储 `yarn_entry_id` 供后续小样联动使用。需要给 `pattern_library` 表添加可选字段：

```sql
ALTER TABLE pattern_library ADD COLUMN linked_yarn_id uuid REFERENCES yarn_entries(id);
```

### 标注存储格式
```json
{
  "type": "pen",
  "data": {
    "paths": [[x1,y1],[x2,y2]...],
    "color": "#ff0000",
    "width": 2
  }
}
```

