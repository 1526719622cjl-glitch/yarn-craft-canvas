
目标是一次性修复 4 个仍未完成的问题：样片实验室一键清空、线材库图片同步、像素图“原始颜色+当前方向”双基准、图解库 PDF/图片文字标注。

## 已确认根因

1. 样片实验室没有“一键清空”
- `SwatchLab.tsx` 只有局部删图和保存，没有统一重置入口。
- 当前需要同时清空 store 状态、表单状态、图片状态、文件输入值。

2. 线材库图片没有真正同步
- `SwatchLab.tsx` 的 `handleSaveToCloud` 会先上传图片再存 URL。
- 但 `YarnGaugeVault.tsx` 的 `handleSaveYarn` 直接把 `preWashImage/postWashImage` 写进表。
- 如果传入的是本地 data URL，就不是稳定的持久地址；加载时也没有在空值情况下清空旧图。
- 同时“加载线材后名称排在最前面”的显示依赖 `SwatchLab.tsx` 的本地 state，同步逻辑需要补全清空/覆盖分支。

3. 最大颜色数调整没有保留当前方向
- `PixelGenerator.tsx` 现在的 `useEffect([colorCount])` 虽然从 `baseImageDataUrl` 重建，但只是按当前宽高 `drawImage`，没有保存“旋转后的方向状态”。
- `rotateCanvas90()` 只改了当前 grid 和尺寸，没有同步一个独立的方向基准。
- 所以重新量化时会回到未旋转方向的重采样结果。

4. 图解库文字标注两边都不完整
- `PatternDetail.tsx` 中 PDF 仍然是 `iframe`，没有接入 `PatternViewer`，所以 PDF 不可能有文字工具。
- `PatternViewer.tsx` 里现有文字工具被放在同一层，父层在非绘制状态下 `pointerEvents: none`，已添加的文字/便签会失去可编辑性。

## 实现方案

### 1. 样片实验室加“一键清空当前数据”
文件：
- `src/pages/SwatchLab.tsx`

修改：
- 增加一个明显的“清空当前数据”按钮，放在保存/报告相关操作区。
- 用确认弹窗避免误触。
- 清空以下内容：
  - `setSwatchData(...)` 回到默认样片值
  - `setProjectPlan(...)` 回到默认项目规划值
  - `yarnName / yarnBrand / yarnWeight / fiberContent / projectName`
  - `preWashImage / postWashImage`
  - `customToolSize / isCustomToolSize`
  - `selectedFolderId`
  - 两个文件 input 的 `.value`
- 只清空当前编辑态，不删除库中已保存数据。

### 2. 统一线材图片保存与加载
文件：
- `src/pages/SwatchLab.tsx`
- `src/components/swatch/YarnGaugeVault.tsx`

修改：
- 把 `uploadSwatchPhoto` 提升为可复用保存能力，传给 `YarnGaugeVault`，或将“库内保存”统一委托给 `SwatchLab`。
- `YarnGaugeVault.tsx` 保存线材时不再直接写本地图片字符串，而是先上传，再存 `pre_wash_photo_url / post_wash_photo_url`。
- `onLoadYarn` 回调补全覆盖逻辑：
  - 设置 `yarnName`
  - 设置 `yarnBrand`
  - 若有图则加载 URL
  - 若无图则显式清空 `setPreWashImage(null)` / `setPostWashImage(null)`
- 这样线材名称和图片都能随加载立即同步，不会残留上一条数据。

### 3. 像素图改成“原始颜色 + 当前方向”双基准
文件：
- `src/pages/PixelGenerator.tsx`

修改：
- 新增独立方向状态，例如 `rotationTurns`（0/1/2/3）。
- 首次导入裁剪确认后：
  - `baseImageDataUrl` 固定保存“原始基准图”
- 旋转画布时：
  - 继续更新当前 `pixelGrid`
  - 同时更新 `rotationTurns`
- 调整最大颜色数时：
  - 始终从 `baseImageDataUrl` 重新取样
  - 先按当前方向状态把原图做同向旋转
  - 再按当前 `gridWidth/gridHeight` 重新量化生成新 grid
- 不再让颜色重算依赖当前 `pixelGrid` 的已量化结果。
- 若页面里还有“同步颜色”按钮走旧逻辑，也一起改到同一套重建函数，避免回退。

### 4. 修复图片文字标注可编辑
文件：
- `src/components/pattern/PatternViewer.tsx`

修改：
- 将“绘制捕获层”和“已存在文字/便签交互层”拆开。
- 规则改为：
  - pen/highlight/note/text 放置时，只有绘制层接管指针
  - 已有 `notes` / `texts` 始终保持 `pointer-events: auto`
- 保留现有文本输入逻辑，但确保：
  - 点击文字可再次编辑
  - 回车或失焦可完成输入
  - 空文本可删除或保留占位（实现时选当前结构最少改动方案）

### 5. 让 PDF 进入同一套标注系统
文件：
- `src/pages/PatternDetail.tsx`
- 可新增一个轻量 PDF 渲染组件
- 可复用 `src/lib/thumbnailGenerator.ts` 里的 `pdfjs-dist` 配置

修改：
- 替换当前 PDF `iframe` 预览。
- 用 PDF.js 将当前页渲染成 canvas / image。
- 将渲染结果传入 `PatternViewer`，从而复用现有：
  - 画笔
  - 高亮
  - 便签
  - 文字输入
  - 保存标注
- 第一版优先支持单页查看与标注；若现有详情页没有分页 UI，可先渲染首页，后续再扩展多页切换。

## 涉及文件
- `src/pages/SwatchLab.tsx`
- `src/components/swatch/YarnGaugeVault.tsx`
- `src/pages/PixelGenerator.tsx`
- `src/components/pattern/PatternViewer.tsx`
- `src/pages/PatternDetail.tsx`
- 可能新增：`src/components/pattern/PdfPatternViewer.tsx`

## 建议实现顺序
1. `SwatchLab.tsx`：一键清空
2. `SwatchLab.tsx` + `YarnGaugeVault.tsx`：线材图片上传/加载统一
3. `PixelGenerator.tsx`：加入 `rotationTurns`，修正颜色重算
4. `PatternViewer.tsx`：修复图片文字编辑交互
5. `PatternDetail.tsx`：PDF 改为 PDF.js 渲染并接入标注层

## 预期结果
- 样片实验室可一键清空当前内容
- 线材库保存和加载都能稳定同步洗前/洗后图片
- 最大颜色数调整始终以原图颜色为准，但保持当前旋转方向
- 图片图解文字可正常输入与再次编辑
- PDF 图解也拥有与图片版一致的文字标注能力
