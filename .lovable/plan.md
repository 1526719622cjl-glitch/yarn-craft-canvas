目标是同时修复 5 个问题，并尽量复用现有结构，不做无关重构。

1. 像素颜色调整逻辑改为“双基准”

- 现状：`PixelGenerator.tsx` 里 `colorCount` 变化会直接用 `uploadedImage + 当前 gridWidth/gridHeight` 重新处理，导致方向也回到原始图方向。
- 需要改成：
  - 颜色来源：始终基于“第一次确认导入后的原始基准图”
  - 方向来源：始终基于“当前画布方向/尺寸”
- 实现方式：
  - 新增一个单独状态保存“原始基准图片 dataUrl”
  - 首次导入裁剪确认后写入这个基准图
  - 后续调最大颜色数时，不再用当前 `uploadedImage`，而是用“原始基准图”重新渲染到“当前 gridWidth/gridHeight”
  - 旋转画布后只更新画布尺寸与像素布局，不覆盖原始基准图
- 结果：颜色量化仍以第一张图为准，但方向跟随旋转后的结果。

2. 样片报告补上项目名称显示

- 代码里 `SwatchLab.tsx` 已把 `projectName` 传给 `SwatchReportGenerator.tsx`，报告组件也有显示位。
- 问题大概率是报告顶部只在标题下弱显示，或打开报告前后状态没有同步到可编辑区。
- 修改方案：
  - 在 `SwatchReportGenerator.tsx` 顶部表单区域明确增加“项目名称”输入/展示
  - 用本地 state 同步 `projectName`，并在 props 变化时更新
  - 在预览卡片中把项目名称放进“项目规划”模块里再次展示，避免只在标题下方显示导致用户误以为没同步
- 结果：项目名称在报告编辑区和报告预览区都清晰可见。

3. 线材库卡片把线材名称放最前面、更醒目

- 当前 `YarnGaugeVault.tsx` 中线材名虽在标题行，但信息层级不够突出，且品牌/材质/密度紧随其后。
- 修改方案：
  - 保持首行只突出显示线材名称
  - 品牌、材质、密度下移为次级信息
  - 在上传图解关联线材处，选择项文案也改成“线材名在前，品牌在后”
    - 现在 `PatternUploadDialog.tsx` 用的是 `品牌 - 名称`
    - 改为 `名称 · 品牌`
- 结果：无论在线材库列表还是图解关联选择里，用户第一眼先看到线材名称。

4. 修复图片图解仍无法标注

- 我检查到：
  - `PatternDetail.tsx` 对图片文件确实走 `PatternViewer`
  - `PatternViewer.tsx` 也已经在标注时禁用了缩放
- 说明问题更可能是“标注层尺寸和图片实际显示尺寸未对齐”：
  - 现在图片是 `object-contain`
  - 但覆盖层用了 `absolute inset-0`，是按父容器铺满，不一定和图片实际可见区域完全一致
- 修改方案：
  - 让图片和标注层包裹在同一个“按图片实际尺寸撑开”的容器里
  - 给图片设置明确的容器尺寸基准，SVG 与 textarea 标注层都跟随这张图片本体尺寸，而不是跟随外层容器
  - 补充 `touch-action: none` / `pointer` 处理，避免移动端和部分浏览器手势吞掉绘制事件
- 结果：图片上传的图解可以正常画笔、高亮、便签标注，位置也不会漂移。

5. 文案改为 “All for yarn”

- 当前 `translations.ts` 里仍是：
  - `sidebar.subtitle: 线·索 · 编织设计套件`
  - `sidebar.footer: 全栈编织设计套件`
- 修改方案：
  - 统一改成 `All for yarn`
  - 如果 `Sidebar.tsx` 里主标题仍写死 `Yarn Clues`，保留品牌名，只改副标题和页脚
  - 同时把 `auth.subtitle` 一并同步，避免登录页仍出现旧文案
- 结果：品牌保留 Yarn Clues，说明文案统一为线索 · All for yarn。

涉及文件

- `src/pages/PixelGenerator.tsx`
- `src/components/swatch/SwatchReportGenerator.tsx`
- `src/components/swatch/YarnGaugeVault.tsx`
- `src/components/pattern/PatternViewer.tsx`
- `src/components/pattern/PatternUploadDialog.tsx`
- `src/i18n/translations.ts`

实现顺序

1. 先修 `PixelGenerator.tsx` 的原图基准 + 当前方向逻辑
2. 再修 `SwatchReportGenerator.tsx` 的项目名称同步与展示
3. 调整 `YarnGaugeVault.tsx` 和 `PatternUploadDialog.tsx` 的线材名称展示顺序
4. 修 `PatternViewer.tsx` 的图片标注层对齐问题
5. 最后统一 `translations.ts` 中的 All for yarn 文案