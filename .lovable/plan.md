

# 样片实验室多项 UI/逻辑修改

## 修改清单

### 1. 极速版布局改为竖向（与 Pro 一致）
**文件**: `src/pages/SwatchLab.tsx` QuickCalcMode（第139-231行）
- 当前极速版小样信息是 `grid-cols-2`（宽度+针数横排、高度+行数横排），Pro 版是宽度+高度一行、针数+行数一行
- 统一为 Pro 版的排列：第一行宽度+高度，第二行针数+行数
- 目标尺寸同理

### 2. 极速版历史记录可点击导入+修改
**文件**: `src/pages/SwatchLab.tsx` QuickCalcMode
- 点击历史记录项时，将该记录的数据回填到表单（swatchWidth/Height、stitches/rows、targetWidth/Height）
- 回填后用户可修改任意字段并重新计算

### 3. Pro 版无洗后数据时收起分析 UI
**文件**: `src/pages/SwatchLab.tsx` ProMode（第790-811行）
- 当 `hasPostWashData === false` 时，不渲染缩水分析区块（完全隐藏），而非显示"暂无洗后数据"提示
- 导入含洗后数据的线材时，自动展开 `postWashOpen` 和显示分析

### 4. 保存到线材库和生成报告放右侧
**文件**: `src/pages/SwatchLab.tsx`（第813-834行）
- 将保存和报告按钮改为 `justify-end`（靠右对齐）

### 5. 报告包含所有线材详情
**文件**: `src/components/swatch/SwatchReportGenerator.tsx`
- 报告 props 增加 `colorCode`、`fiberContent`、`weight`（粗细）字段
- 报告中线材信息区展示：名称、品牌、色号、粗细、纤维成分
- 密度表格中的显示格式改为 `10×10cm：XX针 × XX行`（与填写时一致）
- 调用处传入这些额外字段

### 6. 离开 Pro 版时提醒保存
**文件**: `src/pages/SwatchLab.tsx` SwatchLab 主组件
- 当用户在 Pro 模式下切换 tab 或切换到极速模式时，检查是否有未保存数据
- 如果有数据（如 yarnName 不为空或 stitchesPreWash > 0），弹出 confirm 提示"当前数据尚未保存到线材库，确定要离开吗？"
- 需要在 ProMode 暴露一个 `hasUnsavedData` 状态给父组件，或用 ref

### 7. 线材库"加载"改为弹出详情（无确认导入按钮）
**文件**: `src/components/swatch/YarnGaugeVault.tsx` YarnCard（第401-508行）
- 点击"查看详情"时展开所有信息（品牌、系列、色号、成分、工具、密度、历史密度、图片）
- 移除"确认导入"按钮
- 展开区域右上角加关闭 X 按钮（就是收起）

### 8. "以此开坑"改名为"导入计算"
**文件**: `src/components/swatch/YarnGaugeVault.tsx`
- 文本从 `🧶 以此开坑` 改为 `导入计算`

### 9. 导入计算时同步图片
**文件**: `src/pages/SwatchLab.tsx` handleStartProject
- 当前 `handleStartProject` 只设置 `pendingYarn` 然后由 `useEffect` 在 ProMode 中处理
- ProMode 第374行已有 `setPreWashImage(pendingYarn.pre_wash_photo_url || null)` 和 `setPostWashImage`
- 问题可能是 URL 为 null。检查 YarnGaugeVault 的 `handleLoadYarn` 是否在 `onStartProject` 之前调用——当前第255行 `onStartProject` 回调中先调用了 `handleLoadYarn(yarn)` 再调用 `onStartProject(yarn)`，store 更新是异步的
- 需确保 `pendingYarn` 对象本身携带了 `pre_wash_photo_url` 和 `post_wash_photo_url`

### 10. 线材库卡片 UI 修复按钮溢出
**文件**: `src/components/swatch/YarnGaugeVault.tsx` YarnCard
- 卡片添加 `p-3` 统一内边距，按钮区域固定在底部
- 确保 `overflow-hidden` 在卡片容器上

### 11. 线量估算填写顺序：先克重后米数
**文件**: `src/components/swatch/SmartYarnCalculator.tsx`（第222-231行）
- 项目需求区：将"总需克重"放第一个，"总需米数"放第二个
- 标签调整："总需克重" 和 "总需米数（优先）"

### 12. 合股线材中文命名
**文件**: `src/components/swatch/SmartYarnCalculator.tsx`（第35-40行）
- `createEmptyYarn` 中，非首个线材的 label 从 `Yarn ${String.fromCharCode(65 + index)}` 改为 `线材${index + 1}`

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/SwatchLab.tsx` | 极速版布局、历史导入、Pro 缩水分析隐藏、按钮右对齐、离开提醒、报告传参 |
| `src/components/swatch/YarnGaugeVault.tsx` | 卡片展开详情改版、移除确认导入、改名导入计算、UI 修复 |
| `src/components/swatch/SwatchReportGenerator.tsx` | 增加线材详情字段、密度格式统一 |
| `src/components/swatch/SmartYarnCalculator.tsx` | 填写顺序调换、中文线材命名 |

## 实现顺序

1. SmartYarnCalculator：填写顺序 + 中文命名
2. SwatchReportGenerator：增加线材详情 + 密度格式
3. YarnGaugeVault：卡片展开改版 + 导入计算 + UI
4. SwatchLab：极速布局 + 历史导入 + Pro 缩水隐藏 + 按钮右对齐 + 离开提醒 + 图片同步

