

# AI解析增强 + PDF缩略图修复 + 步骤编辑

## 问题诊断

1. **PDF AI解析失败 (Memory limit exceeded)**: Edge Function 日志显示下载PDF并转base64时内存溢出。Supabase Edge Functions 内存限制约150MB，大PDF会超出。
2. **AI解析逻辑需改进**: 用户希望先显示原文，再翻译为中文，且每步可编辑。
3. **PDF缩略图不显示**: `thumbnailGenerator.ts` 使用 `pdfjs-dist` 在客户端生成缩略图，但上传流程是后台异步的——弹窗关闭后文件才上传，缩略图生成在后台可能失败或时序问题导致 `cover_image_url` 未更新。需要在库页面刷新时能看到。

## 修改方案

### 1. 修复 PDF AI 解析 — 避免内存溢出

**文件**: `supabase/functions/parse-chart-image/index.ts`

- 不再下载整个 PDF 到内存
- 改为将 PDF URL 直接传给 Gemini（Gemini 2.5 Pro 支持通过 URL 读取 PDF）
- 如果 URL 是公开的 Supabase Storage URL，直接用 `image_url.url` 传递即可
- 同时改用 `google/gemini-2.5-flash` 降低延迟和内存压力

**关键改动**:
```typescript
// 不再下载 PDF，直接传 URL
userContent = [
  { type: "text", text: "..." },
  { type: "image_url", image_url: { url: imageUrl } },
];
```

### 2. AI 解析增强 — 原文 + 中文翻译 + 步骤编辑

**Edge Function 修改** (`parse-chart-image/index.ts`):
- 更新 system prompt：要求返回 `originalInstruction`(原文) 和 `translatedInstruction`(中文翻译)
- 更新 tool schema 增加这两个字段

**ParsedStep 接口扩展**:
```typescript
export interface ParsedStep {
  row: number;
  instruction: string;          // 原文
  translatedInstruction?: string; // 中文翻译
  anchorRegion?: {...};
  colors?: {...}[];
}
```

**AIParsePanel.tsx 修改**:
- 每个步骤显示原文 + 翻译（两行）
- 添加编辑按钮，点击后切换为 `<input>` 可修改 `instruction` 和 `translatedInstruction`
- 新增 `onStepsUpdated` 回调，编辑后更新父组件 steps 状态

### 3. 修复 PDF 缩略图

**问题根因**: 后台异步上传时 `generateThumbnail` 对 PDF 调用 `pdfjs-dist`，但此时弹窗已关闭，页面可能已导航走。另外 `shouldSetCover` 的检查时机可能有竞态。

**修复方案** (`usePatternLibrary.ts`):
- 将缩略图生成移到上传前（在弹窗关闭前生成 blob，然后带着 blob 异步上传）
- 在 `PatternUploadDialog.tsx` 中，提交前先生成缩略图 blob
- 将 thumbnailBlob 传给后台上传函数

或更简单的方案：
- 在 `uploadFile` 中确保 PDF 缩略图生成成功后再更新 `cover_image_url`
- 添加 `fetchPatterns()` 刷新调用在文件上传完成后

**实际修复**: 在 `PatternUploadDialog.handleSubmit` 中，改为先在前台生成缩略图 blob，存入变量，然后关闭弹窗后异步上传时使用已生成的 blob。

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 修复 Edge Function PDF 解析（去掉下载/base64，直接传 URL） | parse-chart-image/index.ts |
| 2 | 更新 prompt 返回原文+翻译 | parse-chart-image/index.ts |
| 3 | AIParsePanel 显示原文+翻译+编辑 | AIParsePanel.tsx |
| 4 | 修复 PDF 缩略图（前台预生成 blob） | PatternUploadDialog.tsx, usePatternLibrary.ts |
| 5 | 上传完成后刷新库列表 | usePatternLibrary.ts |

