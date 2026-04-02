

# 样片实验室多项修复与增强

## 修改清单

### 1. Pro 版洗前小样宽高默认 10
**文件**: `src/pages/SwatchLab.tsx` 第305-313行
- `safeSwatchData` 的 fallback 值已经是 10，但 store 初始值可能为 0（清空后）。问题在于清空时设为 0，重新进入 Pro 时显示 0 而非 10。
- 修复：清空逻辑中 `preWashWidth/preWashHeight` 设为 10 而非 0

### 2. 线材报告移到缩水分析下方，不含项目规划器内容
**文件**: `src/pages/SwatchLab.tsx`
- 将"保存到线材库"按钮 + 报告生成按钮移到缩水分析区块（第724-744行）之后
- `SwatchReportGenerator` 调用时移除 `projectPlan`、`compensatedStitches`、`compensatedRows`、`projectName` 参数
- 报告仅包含样片密度 + 缩水分析数据

### 3. 所有删除/清空操作前确认
**文件**: `src/pages/SwatchLab.tsx`、`src/components/swatch/YarnGaugeVault.tsx`
- 快速模式"一键清空"历史（第202行）：加 `confirm()` 
- Pro 模式清空按钮（第512行）：已有 confirm，保留
- 线材库删除文件夹（第217行）：加 `confirm()`
- 线材库删除线材（第254行）：加 `confirm()`

### 4. Pro 版线材信息搜索 + 从线材库导入
**文件**: `src/pages/SwatchLab.tsx`
- 在线材信息折叠区（第544行）内顶部增加"从线材库导入"按钮
- 点击弹出 Dialog，内含搜索框 + 线材列表（复用 `useYarnEntries` 的 searchQuery）
- 选择线材后填充：name、brand、color_code、fiber_content、weight、toolType、toolSizeMm + swatch data + 图片

### 5. 线材信息加色号字段
**文件**: `src/pages/SwatchLab.tsx`
- ProMode 中增加 `colorCode` state
- 线材信息折叠区加一个色号 Input
- 保存时传入 `color_code`（当前第419行硬编码为 null）

### 6. 纤维成分加号按钮缩小并移到第一行后
**文件**: `src/components/swatch/FiberContentSelector.tsx`
- 将底部的"添加成分"按钮改为小图标按钮，放在第一行右侧
- 只在第一行旁显示加号，后续行只显示删除按钮

### 7. 重复保存检测
**文件**: `src/pages/SwatchLab.tsx`
- `handleSaveToCloud` 中，保存前查询 `yarn_entries` 是否存在同名、同品牌、同密度的记录
- 如果存在，toast 提示"线材库已存在相同记录"，不执行保存

### 8. 线材库"加载"按钮重新定义：原地展开详情
**文件**: `src/components/swatch/YarnGaugeVault.tsx`
- 点击"加载"不再立即调用 `onLoadYarn`
- 改为在卡片内展开一个小面板，显示：品牌、系列、色号、成分 + 该线材所有历史密度记录（需查询同 name+brand 的 yarn_entries 的不同密度）
- 展开面板内有"确认导入"按钮执行原 `handleLoadYarn`

### 9. "以此开坑"带入图片
**文件**: `src/pages/SwatchLab.tsx` 第358-368行
- `pendingYarn` 处理中已设置 `setPreWashImage(pendingYarn.pre_wash_photo_url)` 和 `setPostWashImage(pendingYarn.post_wash_photo_url)`，这部分已实现
- 但 `onStartProject` 在 `YarnGaugeVault` 中直接调用，store 的 `setSwatchData` 没有被 `handleStartProject` 触发
- 修复：确保 `handleStartProject` 也调用 `handleLoadYarn`（设置 store swatchData），然后再触发 tab 跳转

### 10. 线材库 UI 优化
**文件**: `src/components/swatch/YarnGaugeVault.tsx`
- 卡片使用更紧凑布局，按钮始终在卡片内底部显示（不溢出）
- 使用 `overflow-hidden` 确保缩放时按钮不跑出卡片
- 加载/开坑按钮用小尺寸 icon+text，保持在卡片 padding 内

### 11. 线量估算算法修正
**文件**: `src/components/swatch/SmartYarnCalculator.tsx`
- 当前算法问题：只用克重或只用米数单独计算。正确逻辑应优先用米数。
- 修正算法：
  - 输入：每球克重、每球米数、项目总需米数或总需克重
  - 如果输入了总需米数 + 每球米数：`balls = ceil(totalMeters * buffer / metersPerBall)`
  - 如果输入了总需克重 + 每球克重 + 每球米数：先算总需米数 `totalMeters = totalGrams / gramsPerBall * metersPerBall`，然后按米数算球数
  - 如果只有总需克重 + 每球克重（无米数）：`balls = ceil(totalGrams * buffer / gramsPerBall)`
  - 核心思想：**米数是编织实际消耗的度量，克重是辅助换算**

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/SwatchLab.tsx` | 默认值修正、报告位置、搜索导入、色号、重复检测、清空确认 |
| `src/components/swatch/YarnGaugeVault.tsx` | 加载展开详情、UI优化、删除确认 |
| `src/components/swatch/FiberContentSelector.tsx` | 加号按钮缩小移位 |
| `src/components/swatch/SmartYarnCalculator.tsx` | 算法修正 |

## 实现顺序

1. Pro 默认值 + 色号 + 纤维加号样式
2. 报告移位 + 删除确认 + 重复保存检测
3. 线材库搜索导入功能
4. 线材库 UI 优化 + 加载展开详情
5. 线量估算算法修正

