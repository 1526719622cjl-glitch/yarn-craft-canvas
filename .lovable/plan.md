

# 修复：样片线材同步图片 + 像素旋转重置 + 图解库增强

## 问题分析

### 1. 样片线材同步缺少图片
`yarn_entries` 数据库表没有照片字段。`preWashImage`/`postWashImage` 只是 SwatchLab 的本地 React state。需要在 `yarn_entries` 表中添加 `pre_wash_photo_url` 和 `post_wash_photo_url` 列，保存到线材库时上传图片到 storage，加载时同步图片。

### 2. 像素旋转后调整颜色重置
当前同步按钮调用 `processImageWithDimensions(uploadedImage, gridWidth, gridHeight)`，从原始上传图片重新处理，这会丢失旋转和手动编辑。需要改为从当前 `pixelGrid` 提取颜色并重新量化，而非从原始图片重新处理。

### 3. 定位编织颜色显示
上一次编辑已将 `PixelKnittingGuide` 改为按实际排列顺序显示。已修复。

### 4. 图解库功能
上一次编辑已完成：移除 AI 解析/跟织、添加收藏红心、实物图片上传。已修复。

---

## 修改方案

### 步骤 1：数据库迁移
为 `yarn_entries` 添加两个照片字段：
```sql
ALTER TABLE public.yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_photo_url text;
ALTER TABLE public.yarn_entries ADD COLUMN IF NOT EXISTS post_wash_photo_url text;
```

### 步骤 2：保存线材时上传图片 — `SwatchLab.tsx`
在 `handleCloudSave` 中，如果有 `preWashImage`/`postWashImage`（dataURL），先上传到 `pattern-files` storage bucket，获取 public URL 后一并存入 `yarn_entries`。

### 步骤 3：加载线材时同步图片 — `YarnGaugeVault.tsx`
`handleLoadYarn` 回调已传入完整 `YarnEntry`。在 SwatchLab 中通过 `onLoadYarn` 回调接收 yarn 数据，读取 `pre_wash_photo_url`/`post_wash_photo_url` 并设置到 `preWashImage`/`postWashImage`。

### 步骤 4：像素颜色同步不重置旋转 — `PixelGenerator.tsx`
替换同步按钮逻辑：从当前 `pixelGrid` 提取所有颜色 → 用 K-means 重新量化为 `colorCount` 种颜色 → 将每个像素映射到最近的新颜色 → 更新 grid，不改变尺寸和排列。

### 步骤 5：翻译补充

---

## 实现顺序

| 步骤 | 任务 | 文件 |
|------|------|------|
| 1 | 添加照片字段到 yarn_entries | 数据库迁移 |
| 2 | 保存线材时上传图片 | SwatchLab.tsx |
| 3 | 加载线材时同步图片 | SwatchLab.tsx |
| 4 | 像素颜色同步从 grid 重新量化 | PixelGenerator.tsx |

