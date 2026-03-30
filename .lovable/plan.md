

# 修复线材库图片保存与加载同步

## 问题根因

`SwatchLab.tsx` 第208-209行的 `handleSaveToCloud` 和 `YarnGaugeVault.tsx` 第104-110行的 `handleSaveYarn` 都调用 `uploadSwatchPhoto`。但 `uploadSwatchPhoto`（第189-201行）内部用 `fetch(dataUrl)` 将图片转 blob 再上传。

两个问题：
1. **`handleSaveToCloud` 没有区分 data URL 和已有公共 URL** — 如果图片是从线材库加载的（已经是 `https://` URL），`fetch()` 可能因 CORS 失败，静默返回 `null`，导致保存时图片 URL 被覆盖为 null
2. **`YarnGaugeVault` 的 `handleSaveYarn`** 虽然检查了 `startsWith('data:')` 才上传，但对非 data URL 直接用 `preWashImage` 原值——如果 props 里传的是 null 或空值，也会丢图

## 修复方案

### 文件：`src/pages/SwatchLab.tsx`

修改 `handleSaveToCloud`（第207-209行）：
- 如果 `preWashImage` 已经是 `https://` URL，直接使用，不再重新上传
- 只有 `data:` 开头的才调用 `uploadSwatchPhoto`
- `postWashImage` 同理

```typescript
const prePhotoUrl = preWashImage
  ? (preWashImage.startsWith('data:') ? await uploadSwatchPhoto(preWashImage, 'pre') : preWashImage)
  : null;
const postPhotoUrl = postWashImage
  ? (postWashImage.startsWith('data:') ? await uploadSwatchPhoto(postWashImage, 'post') : postWashImage)
  : null;
```

这是唯一需要修改的地方。`YarnGaugeVault` 的 `handleSaveYarn` 已经有 `startsWith('data:')` 检查，逻辑正确。

## 涉及文件
- `src/pages/SwatchLab.tsx`（2行修改）

