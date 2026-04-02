

# 样片实验室多项修改

## 修改清单

### 1. 修复 Pro 模式从线材库导入功能
**问题**：`YarnGaugeVault` 的 `onLoadYarn` 回调只在 SwatchLab 层面设置了 yarn name/brand 等文本字段，但 `handleLoadYarn` 内部调用 `setSwatchData` 更新了 store 数据。Pro 模式的 `safeSwatchData` 来自 store，但 `setUndoableSwatch` 是从初始 `safeSwatchData` 计算的，不会响应外部 store 更新。

**修复**：在 `onLoadYarn` 回调中，除了设置 yarn metadata，还需要调用 `setUndoableSwatch` 直接更新 undo/redo 状态，让洗前/洗后数据同步。或者添加一个 `useEffect` 监听 store 中 `swatchData` 的变化来同步 undo state。

### 2. 删除"宽度补偿系数"和"高度补偿系数"显示
**文件**：`src/pages/SwatchLab.tsx` 第694-714行

- 缩水分析区块中，只保留横向/纵向缩水率百分比（2列），删除 `widthFactor` 和 `heightFactor` 的显示（后2列）
- 内部计算逻辑保留，仅移除 UI 展示

### 3. 洗后尺寸填写时自动同步针数
**文件**：`src/pages/SwatchLab.tsx` 第641-660行

- 当用户填写洗后宽度或高度任一值时，自动将洗后针数/行数设为与洗前一致
- 在 `handleSwatchChange` 中检测：如果更新包含 `postWashWidth` 或 `postWashHeight`，且当前洗后针数为 0 或与洗前不同，则自动设置 `stitchesPostWash = stitchesPreWash`、`rowsPostWash = rowsPreWash`

### 4. "保存到线材库"移到项目规划器上方
**文件**：`src/pages/SwatchLab.tsx`

- 将"保存到线材库"按钮从项目规划器底部的 action 区域移出
- 放在项目规划器卡片之前，作为独立区块或按钮行
- 不将计算数据存入线材库（保存时不包含项目规划器的 targetWidth/targetHeight/startingStitches 等）
- 删除备注（`projectNotes`）字段

### 5. 生成报告条件约束
- "生成报告"按钮保留在项目规划器最底部
- 当 `projectName` 为空时，隐藏"生成报告"按钮

### 6. 三 Tab 架构重构

**文件**：`src/pages/SwatchLab.tsx`

页面顶部改为三个平级 Tab（Segmented Control）：
```text
[ 样片数据计算 ] | [ 我的线材库 ] | [ 线量需求估算 ]
```

- **样片数据计算**（默认）：包含当前的 极速/专业Pro 切换开关 + 对应内容
- **我的线材库**：仅在专业模式下可用。将当前嵌入在 Pro 模式底部的 `YarnGaugeVault` 提升为独立 Tab 内容。每条线材卡片增加 `🧶 以此开坑` 按钮，点击后切换回"样片数据计算"Tab 并自动填充线材信息
- **线量需求估算**：将当前 `SmartYarnCalculator` 提升为独立 Tab 内容

### 7. 线材库增强（Tab 内）
- 当未处于专业模式时，线材库 Tab 显示提示"切换到专业模式以使用线材库"
- 每条线材卡片新增 `🧶 以此开坑` 按钮，点击：
  1. 切换 activeTab 到"样片数据计算"
  2. 切换 mode 到 pro
  3. 调用 handleLoadYarn 填充数据

---

## 涉及文件

| 文件 | 改动 |
|------|------|
| `src/pages/SwatchLab.tsx` | 主要重构：三Tab布局、导入修复、UI调整 |

## 实现顺序

1. 添加三 Tab 顶层结构
2. 修复线材库导入同步
3. 洗后尺寸自动同步针数
4. 删除补偿系数显示、移动保存按钮、报告条件约束
5. 线材库 Tab "以此开坑"按钮

