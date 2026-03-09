
# 图解库缩略图 + 中英文翻译统一计划

## 问题分析

1. **缩略图显示问题**：当前图解卡片使用 `cover_image_url` 字段，但在 `usePatternLibrary.ts` 中，只有当第一个文件上传时才设置封面图。用户希望自动生成文件内容的缩略图。

2. **翻译混合问题**：需要检查 `src/i18n/translations.ts` 和所有组件，确保中英文版本完整且统一。

## 技术方案

### 1. 自动缩略图生成

**实现思路**：
- 在 `PatternUploadDialog.tsx` 上传文件后，自动生成缩略图
- 对于图片文件：使用 Canvas API 压缩到 300x400px 的缩略图
- 对于 PDF 文件：使用 PDF.js 渲染第一页为缩略图
- 将缩略图上传到单独的存储路径 `thumbnails/`
- 更新 `pattern_library.cover_image_url` 为缩略图 URL

**新增组件**：
```typescript
// src/lib/thumbnailGenerator.ts
export async function generateThumbnail(file: File): Promise<Blob | null>
export async function generatePDFThumbnail(pdfUrl: string): Promise<Blob | null>
```

**修改文件**：
- `src/hooks/usePatternLibrary.ts`：`uploadFile` 函数增加缩略图生成逻辑
- `src/components/pattern/PatternUploadDialog.tsx`：显示缩略图预览

### 2. 翻译统一检查

**需要检查的文件**：
- `src/i18n/translations.ts`：补全遗漏的翻译键
- 所有 `src/components/` 下的组件：确保使用 `t()` 函数而非硬编码文本
- `src/components/layout/Sidebar.tsx`：导航菜单文本
- `src/pages/` 下的页面组件：页面标题和描述

**重点检查项**：
- 按钮文本（"保存"、"取消"、"删除"等）
- 状态标签（"未织"、"进行中"、"已完成"）
- 表单标签（"标题"、"描述"、"标签"等）
- 错误提示信息
- 加载状态文本

### 3. 数据库优化

**可选升级**：
- 在 `pattern_library` 表添加 `thumbnail_url` 字段，与 `cover_image_url` 分离
- 为缩略图创建专门的存储策略（较小的图片尺寸限制）

## 实现顺序

1. **P0 - 翻译统一**：
   - 检查并补全 `translations.ts`
   - 修复所有组件中的硬编码文本

2. **P0 - 缩略图生成器**：
   - 创建 `thumbnailGenerator.ts` 工具库
   - 集成 PDF.js 用于 PDF 首页渲染

3. **P1 - 上传流程改造**：
   - 修改 `usePatternLibrary.uploadFile`
   - 在文件上传成功后自动生成并上传缩略图
   - 更新图解的封面图 URL

4. **P1 - UI 优化**：
   - `PatternCard` 组件优化缩略图显示效果
   - `PatternUploadDialog` 添加缩略图预览

## 技术细节

### 缩略图生成逻辑
```typescript
// 图片文件
const canvas = document.createElement('canvas');
canvas.width = 300;
canvas.height = 400;
// 使用 Canvas API 绘制压缩图片

// PDF 文件  
import * as pdfjsLib from 'pdfjs-dist';
const pdf = await pdfjsLib.getDocument(url).promise;
const page = await pdf.getPage(1);
// 渲染为 Canvas 然后转为 Blob
```

### 存储路径结构
```
pattern-files/
  ├── {user_id}/{pattern_id}/original/  // 原始文件
  └── {user_id}/{pattern_id}/thumbnails/  // 缩略图
```
