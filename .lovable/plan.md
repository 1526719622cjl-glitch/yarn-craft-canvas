

# 综合修复计划：保存跳转 + PDF预览增强 + AI解析PDF + 翻译统一 + 缩略图

## 6个核心问题

1. **保存后不跳转** — `PatternUploadDialog` 等文件上传完毕才关闭弹窗，体验慢
2. **PDF预览不可缩放/全屏** — 固定高度 iframe，无法调节
3. **AI解析不支持PDF** — Edge Function `isSupportedImageUrl` 阻止PDF，客户端 `canParse` 也限制
4. **AI面板缺少确认+跟织入口** — 解析后无确认步骤，跟织按钮在顶部而非面板内
5. **翻译混合** — `SmartYarnCalculator`(~30处)、`YarnGaugeVault`(~25处) 全是硬编码英文
6. **PDF缩略图** — 上传PDF时未生成封面缩略图

---

## 修改方案

### 1. PatternUploadDialog — 保存后立即关闭并跳转

- 添加 `onNavigate?: (patternId: string) => void` prop
- `handleSubmit`: 创建 pattern 后立即 `onOpenChange(false)` + `onNavigate(pattern.id)`
- 文件上传改为**后台异步**（不阻塞弹窗关闭）
- `PatternLibrary.tsx`: 传入 `onNavigate={(id) => navigate(\`/${category}/${id}\`)}`

### 2. PDF预览增强 — 可缩放 + 全屏

**文件**: `PatternDetail.tsx`

- PDF iframe 容器添加 `resize: vertical; overflow: auto` CSS
- 添加全屏按钮，使用 `element.requestFullscreen()` API
- 默认高度改为 `80vh`，可拖拽调节

### 3. AI解析支持PDF

**Edge Function** `parse-chart-image/index.ts`:
- 移除 `isSupportedImageUrl` 检查
- 检测URL是否为PDF（扩展名或content-type）
- PDF: 下载文件 → 转base64 → 发送为 `inline_data` (mime: `application/pdf`)
- 图片: 保持现有 `image_url` 方式

**客户端**:
- `AIParsePanel.tsx`: 移除 `isSupportedImage` 函数，`canParse` 默认 true
- `PatternDetail.tsx`: `canParse` 改为 `!!currentFileUrl`（不再限制仅图片）

### 4. AI面板底部：确认解析 + 开始跟织

**文件**: `AIParsePanel.tsx`

- 添加 props: `onConfirmSteps`, `onStartCompanion`, `stepsConfirmed`
- 解析完成后底部显示"确认解析内容"按钮
- 确认后显示"开始跟织"按钮
- `PatternDetail.tsx`: 移除顶部独立的"开始跟织"按钮

### 5. 翻译统一

**新增 ~50 个翻译键** 覆盖:

- `SmartYarnCalculator`: "Smart Yarn Calculator", "+10% Buffer", "Grams/Ball", "Meters/Ball", "Add Another Yarn", "Project Requirement", "Total Grams", "OR Total Meters", "You need", "balls of yarn", "Includes 10% buffer", "Per Yarn Breakdown", "total meters", "meters extra", "Enter yarn specs..."
- `YarnGaugeVault`: "Yarn & Gauge Vault", "yarns", "Sign in to access...", "Search yarns...", "Root", "Folder", "Save Yarn", "Create New Folder", "Folder Name", "Save Current Gauge", "Yarn Name *", "Brand", "Color Code", "Fiber Content", "Weight", "Notes", "Current Gauge...", "Swatch:", "Will be saved to:", "Cancel", "Create", "Save", "Brand:", "Fiber:", "Gauge:", "Load", "No yarns found...", "Save your current gauge..."

**修改组件**: 引入 `useI18n()`，替换所有硬编码字符串

### 6. PDF缩略图

**Edge Function** 方式不可行（无Canvas），改用服务端方案:

- 在 `usePatternLibrary.uploadFile` 中，PDF上传时将文件URL直接设为 `cover_image_url`
- `PatternCard.tsx`: 检测 cover URL 是否为 PDF，若是则显示 PDF 图标 + 标题作为占位符
- 更好方案：使用 `<canvas>` + `pdf.js`(CDN worker) 在客户端渲染PDF第一页为缩略图

具体实现：
- 在 `thumbnailGenerator.ts` 中添加 `generatePdfThumbnail(file: File)` 函数
- 使用 `pdfjs-dist` CDN worker 加载PDF → 渲染第一页到Canvas → 转为Blob
- 上传时检测PDF文件 → 生成缩略图 → 上传到 `thumbnails/` 路径 → 设为 cover_image_url

---

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 新增翻译键 | translations.ts |
| 2 | SmartYarnCalculator i18n | SmartYarnCalculator.tsx |
| 3 | YarnGaugeVault i18n | YarnGaugeVault.tsx |
| 4 | Edge Function 支持PDF | parse-chart-image/index.ts |
| 5 | 客户端移除PDF限制 + 确认UI | AIParsePanel.tsx |
| 6 | 保存跳转 + PDF预览增强 | PatternDetail.tsx, PatternUploadDialog.tsx, PatternLibrary.tsx |
| 7 | PDF缩略图生成 | thumbnailGenerator.ts, usePatternLibrary.ts |

