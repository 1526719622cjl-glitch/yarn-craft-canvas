

# Swatch Lab: 织片图片上传 + 报告打印功能

## 需求
1. Pre-Wash 和 Post-Wash 卡片底部各加一个可选的织片图片上传区域
2. 上传的图片同步显示在样片报告中
3. 报告除下载外增加打印功能

## 实现方案

### 1. 图片上传（纯客户端，无需后端存储）

图片仅用于当次报告生成，使用 `URL.createObjectURL` 或 `FileReader` 转为 base64 在本地预览，无需上传到服务器。

**SwatchData 接口扩展**（不改 store，用 SwatchLab 本地 state）：
- `preWashImage: string | null` — base64 data URL
- `postWashImage: string | null` — base64 data URL

### 2. 文件修改

**`src/pages/SwatchLab.tsx`**：
- 新增两个 local state: `preWashImage`, `postWashImage`
- 在 Pre-Wash 和 Post-Wash 卡片的 gauge result 上方，添加图片上传区：
  - 未上传时：显示虚线框 + 相机图标 + "上传织片照片（可选）"
  - 已上传时：显示缩略图 + 删除按钮
  - 使用隐藏的 `<input type="file" accept="image/*">` 触发
- 将 `preWashImage` 和 `postWashImage` 传入 `SwatchReportGenerator`

**`src/components/swatch/SwatchReportGenerator.tsx`**：
- Props 增加 `preWashImage?: string | null` 和 `postWashImage?: string | null`
- 报告中 Yarn Info 下方新增"织片照片"区块，并排展示洗前/洗后照片
- 底部按钮区从单个下载按钮改为两个按钮：
  - 📥 下载报告图片（现有功能）
  - 🖨️ 打印报告
- 打印功能使用 `window.print()` 配合 `@media print` CSS，仅打印报告区域

### 3. 打印实现

在报告 Dialog 中添加打印按钮，点击时：
1. 临时将 `reportRef` 内容设为页面唯一可见内容
2. 调用 `window.print()`
3. 恢复原始状态

或更简洁地：在 `index.css` 添加 `@media print` 规则，隐藏除报告以外的所有元素，通过给报告容器添加特定 class 实现。

### 4. 涉及文件

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/pages/SwatchLab.tsx` | 修改 | 添加图片上传 UI + 传递图片到报告 |
| `src/components/swatch/SwatchReportGenerator.tsx` | 修改 | 显示织片照片 + 添加打印按钮 |
| `src/index.css` | 修改 | 添加 `@media print` 样式 |

