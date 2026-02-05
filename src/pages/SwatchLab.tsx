import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Ruler, Calculator, TrendingUp, TrendingDown, Target, Undo, Redo, Save, Droplets, Info, Loader2, FileImage } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { SmartYarnCalculator } from '@/components/swatch/SmartYarnCalculator';
import { YarnGaugeVault } from '@/components/swatch/YarnGaugeVault';
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useYarnFolders, useYarnEntries, YarnWeight, YarnStatus } from '@/hooks/useYarnVault';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SwatchReportGenerator } from '@/components/swatch/SwatchReportGenerator';

// Tool size presets
const TOOL_SIZES = [2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 8.0, 9.0, 10.0];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export default function SwatchLab() {
  const { 
    swatchData, 
    gaugeData, 
    projectPlan,
    setSwatchData, 
    setProjectPlan,
    calculateGauge,
  } = useYarnCluesStore();

  const { user } = useAuth();
  const { folders } = useYarnFolders();
  const { createEntry } = useYarnEntries();
  
  // Cloud save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [yarnName, setYarnName] = useState('');
  const [yarnBrand, setYarnBrand] = useState('');
  const [yarnWeight, setYarnWeight] = useState<YarnWeight | ''>('');
  const [showReportGenerator, setShowReportGenerator] = useState(false);
  const [customToolSize, setCustomToolSize] = useState('');
  const [isCustomToolSize, setIsCustomToolSize] = useState(false);

  // Safe defaults + null/NaN normalization
  const num = (value: unknown, fallback: number) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };

  const safeGaugeData = {
    preWashStitchDensity: num(gaugeData?.preWashStitchDensity, 0),
    preWashRowDensity: num(gaugeData?.preWashRowDensity, 0),
    postWashStitchDensity: num(gaugeData?.postWashStitchDensity, 0),
    postWashRowDensity: num(gaugeData?.postWashRowDensity, 0),
    gaugeRatio: num(gaugeData?.gaugeRatio, 1),
    widthShrinkage: num(gaugeData?.widthShrinkage, 0),
    heightShrinkage: num(gaugeData?.heightShrinkage, 0),
    widthFactor: num(gaugeData?.widthFactor, 1),
    heightFactor: num(gaugeData?.heightFactor, 1),
  };

  const safeProjectPlan = {
    targetWidth: num(projectPlan?.targetWidth, 50),
    targetHeight: num(projectPlan?.targetHeight, 60),
    startingStitches: num(projectPlan?.startingStitches, 0),
    startingRows: num(projectPlan?.startingRows, 0),
  };

  const safeSwatchData = {
    preWashWidth: num(swatchData?.preWashWidth, 10),
    preWashHeight: num(swatchData?.preWashHeight, 10),
    stitchesPreWash: num(swatchData?.stitchesPreWash, 20),
    rowsPreWash: num(swatchData?.rowsPreWash, 28),
    postWashWidth: num(swatchData?.postWashWidth, 10),
    postWashHeight: num(swatchData?.postWashHeight, 10),
    stitchesPostWash: num(swatchData?.stitchesPostWash, 20),
    rowsPostWash: num(swatchData?.rowsPostWash, 28),
    toolType: swatchData?.toolType ?? null,
    toolSizeMm: swatchData?.toolSizeMm ?? null,
  };

  // Undo/Redo for swatch data
  const {
    state: undoableSwatchData,
    set: setUndoableSwatch,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useUndoRedo(safeSwatchData);

  // Keyboard shortcuts
  useUndoRedoKeyboard(undo, redo);

  // Sync undo state with store
  useEffect(() => {
    if (JSON.stringify(undoableSwatchData) !== JSON.stringify(safeSwatchData)) {
      setSwatchData(undoableSwatchData);
    }
  }, [undoableSwatchData, setSwatchData]);

  useEffect(() => {
    calculateGauge();
  }, [calculateGauge]);

  const handleSwatchChange = (updates: Partial<typeof safeSwatchData>) => {
    setUndoableSwatch((prev) => ({ ...prev, ...updates }));
  };

  // Tool size change handler
  const handleToolSizeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomToolSize(true);
    } else {
      setIsCustomToolSize(false);
      handleSwatchChange({ toolSizeMm: parseFloat(value) });
    }
  };

  const handleCustomToolSizeChange = (value: string) => {
    setCustomToolSize(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      handleSwatchChange({ toolSizeMm: parsed });
    }
  };

  // Cloud save handler
  const handleSaveToCloud = () => {
    if (!yarnName.trim()) return;
    
    createEntry.mutate({
      name: yarnName.trim(),
      brand: yarnBrand.trim() || null,
      color_code: null,
      fiber_content: null,
      weight: (yarnWeight || null) as YarnWeight | null,
      status: 'new' as YarnStatus,
      folder_id: selectedFolderId,
      stitches_per_10cm: safeGaugeData.postWashStitchDensity * 10,
      rows_per_10cm: safeGaugeData.postWashRowDensity * 10,
      post_wash_width_cm: safeSwatchData.postWashWidth,
      post_wash_height_cm: safeSwatchData.postWashHeight,
      pre_wash_width_cm: safeSwatchData.preWashWidth,
      pre_wash_height_cm: safeSwatchData.preWashHeight,
      stitches_pre_wash: safeSwatchData.stitchesPreWash,
      rows_pre_wash: safeSwatchData.rowsPreWash,
      stitches_post_wash: safeSwatchData.stitchesPostWash,
      rows_post_wash: safeSwatchData.rowsPostWash,
      tool_type: safeSwatchData.toolType,
      tool_size_mm: safeSwatchData.toolSizeMm,
      meters_per_ball: null,
      grams_per_ball: null,
      balls_in_stock: 0,
      notes: null,
    });
    
    // Reset form
    setYarnName('');
    setYarnBrand('');
    setYarnWeight('');
    setSelectedFolderId(null);
    setSaveModalOpen(false);
  };

  // Calculate compensated cast-on values
  const compensatedStitches = Math.round(safeProjectPlan.startingStitches * safeGaugeData.widthFactor);
  const compensatedRows = Math.round(safeProjectPlan.startingRows * safeGaugeData.heightFactor);
  const hasShrinkage = safeGaugeData.widthShrinkage !== 0 || safeGaugeData.heightShrinkage !== 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yarn-sage/30 flex items-center justify-center">
              <Ruler className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-semibold text-foreground">The Swatch Lab</h1>
              <p className="text-muted-foreground">Calculate your gauge and plan your project</p>
            </div>
          </div>

          {/* Undo/Redo Controls */}
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={undo}
                  disabled={!canUndo}
                  className="rounded-xl soft-press"
                >
                  <Undo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={redo}
                  disabled={!canRedo}
                  className="rounded-xl soft-press"
                >
                  <Redo className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* Unified Gauge Calculator */}
      <motion.div variants={itemVariants} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pre-Wash Swatch - Independent dimensions */}
          <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-yarn-honey/30 flex items-center justify-center">
                <span className="text-sm">🧶</span>
              </div>
              <h2 className="text-lg font-medium">Pre-Wash Swatch</h2>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Measure your swatch before washing/blocking. Any size works!
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pre-width" className="text-sm text-muted-foreground">Width (cm)</Label>
                <Input
                  id="pre-width"
                  type="number"
                  step="0.1"
                  value={safeSwatchData.preWashWidth}
                  onChange={(e) => handleSwatchChange({ preWashWidth: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pre-height" className="text-sm text-muted-foreground">Height (cm)</Label>
                <Input
                  id="pre-height"
                  type="number"
                  step="0.1"
                  value={safeSwatchData.preWashHeight}
                  onChange={(e) => handleSwatchChange({ preWashHeight: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stitches-pre" className="text-sm text-muted-foreground">Stitch Count</Label>
                <Input
                  id="stitches-pre"
                  type="number"
                  value={safeSwatchData.stitchesPreWash}
                  onChange={(e) => handleSwatchChange({ stitchesPreWash: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rows-pre" className="text-sm text-muted-foreground">Row Count</Label>
                <Input
                  id="rows-pre"
                  type="number"
                  value={safeSwatchData.rowsPreWash}
                  onChange={(e) => handleSwatchChange({ rowsPreWash: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
            </div>

            {/* Pre-wash gauge result */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">Pre-wash gauge:</p>
              <p className="text-sm font-medium">
                {safeGaugeData.preWashStitchDensity.toFixed(2)} st/cm × {safeGaugeData.preWashRowDensity.toFixed(2)} rows/cm
              </p>
            </div>
          </motion.div>

          {/* Post-Wash Swatch - Independent dimensions */}
          <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-yarn-sky/30 flex items-center justify-center">
                <Droplets className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-medium">Post-Wash Swatch</h2>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Same swatch after washing/blocking. Used for final size calculations.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="post-width" className="text-sm text-muted-foreground">Width (cm)</Label>
                <Input
                  id="post-width"
                  type="number"
                  step="0.1"
                  value={safeSwatchData.postWashWidth}
                  onChange={(e) => handleSwatchChange({ postWashWidth: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="post-height" className="text-sm text-muted-foreground">Height (cm)</Label>
                <Input
                  id="post-height"
                  type="number"
                  step="0.1"
                  value={safeSwatchData.postWashHeight}
                  onChange={(e) => handleSwatchChange({ postWashHeight: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stitches-post" className="text-sm text-muted-foreground">Stitch Count</Label>
                <Input
                  id="stitches-post"
                  type="number"
                  value={safeSwatchData.stitchesPostWash}
                  onChange={(e) => handleSwatchChange({ stitchesPostWash: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rows-post" className="text-sm text-muted-foreground">Row Count</Label>
                <Input
                  id="rows-post"
                  type="number"
                  value={safeSwatchData.rowsPostWash}
                  onChange={(e) => handleSwatchChange({ rowsPostWash: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
            </div>

            {/* Post-wash gauge result */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground">Post-wash gauge (for targeting):</p>
              <p className="text-sm font-medium">
                {safeGaugeData.postWashStitchDensity.toFixed(2)} st/cm × {safeGaugeData.postWashRowDensity.toFixed(2)} rows/cm
              </p>
            </div>
          </motion.div>
        </div>

        {/* Tool Size Selector */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-yarn-sage/30 flex items-center justify-center">
              <span className="text-sm">🧶</span>
            </div>
            <h2 className="text-lg font-medium">Tool Size</h2>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                Record the hook or needle size used for this swatch
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tool Type Selector */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Tool Type</Label>
              <Select 
                value={safeSwatchData.toolType || ''} 
                onValueChange={(v) => handleSwatchChange({ toolType: v as 'hook' | 'needle' })}
              >
                <SelectTrigger className="h-12 rounded-xl">
                  <SelectValue placeholder="Select tool..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hook">🪝 钩针 (Hook)</SelectItem>
                  <SelectItem value="needle">🥢 棒针 (Needles)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tool Size Selector */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Size (mm)</Label>
              <div className="flex gap-2">
                <Select 
                  value={isCustomToolSize ? 'custom' : (safeSwatchData.toolSizeMm?.toString() || '')} 
                  onValueChange={handleToolSizeChange}
                >
                  <SelectTrigger className="h-12 rounded-xl flex-1">
                    <SelectValue placeholder="Select size..." />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOL_SIZES.map(size => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}mm
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">✏️ Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomToolSize && (
                  <Input
                    type="number"
                    step="0.01"
                    value={customToolSize}
                    onChange={(e) => handleCustomToolSizeChange(e.target.value)}
                    placeholder="mm"
                    className="w-24 h-12"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Current tool display */}
          {safeSwatchData.toolType && safeSwatchData.toolSizeMm && (
            <div className="pt-3 border-t border-border/30">
              <p className="text-sm text-muted-foreground">
                Using: <span className="font-medium text-foreground">
                  {safeSwatchData.toolType === 'hook' ? '🪝 钩针' : '🥢 棒针'} {safeSwatchData.toolSizeMm}mm
                </span>
              </p>
            </div>
          )}
        </motion.div>

        {/* Shrinkage Analysis */}
        {hasShrinkage && (
          <motion.div variants={itemVariants} className="p-4 rounded-2xl bg-yarn-honey/20 border border-yarn-honey/30">
            <h3 className="text-sm font-medium mb-3">Shrinkage Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-display font-semibold text-primary">
                  {safeGaugeData.widthShrinkage > 0 ? '-' : '+'}{Math.abs(safeGaugeData.widthShrinkage).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Width {safeGaugeData.widthShrinkage > 0 ? 'shrinkage' : 'stretch'}</p>
              </div>
              <div>
                <p className="text-2xl font-display font-semibold text-primary">
                  {safeGaugeData.heightShrinkage > 0 ? '-' : '+'}{Math.abs(safeGaugeData.heightShrinkage).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Height {safeGaugeData.heightShrinkage > 0 ? 'shrinkage' : 'stretch'}</p>
              </div>
              <div>
                <p className="text-2xl font-display font-semibold text-secondary-foreground">
                  ×{safeGaugeData.widthFactor.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Width factor</p>
              </div>
              <div>
                <p className="text-2xl font-display font-semibold text-secondary-foreground">
                  ×{safeGaugeData.heightFactor.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Height factor</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Project Planner */}
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-medium">Project Planner</h2>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Enter your desired finished size. Results use post-wash gauge for accurate targeting.
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Target Dimensions (finished size)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-width" className="text-sm text-muted-foreground">Width (cm)</Label>
                  <Input
                    id="target-width"
                    type="number"
                    value={safeProjectPlan.targetWidth}
                    onChange={(e) => setProjectPlan({ targetWidth: Number(e.target.value) })}
                    className="input-glass h-12 text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-height" className="text-sm text-muted-foreground">Height (cm)</Label>
                  <Input
                    id="target-height"
                    type="number"
                    value={safeProjectPlan.targetHeight}
                    onChange={(e) => setProjectPlan({ targetHeight: Number(e.target.value) })}
                    className="input-glass h-12 text-lg font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Cast-on Count
                <span className="text-xs text-primary">(using post-wash gauge)</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="frosted-panel text-center">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {safeProjectPlan.startingStitches}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">stitches</p>
                </div>
                <div className="frosted-panel text-center">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {safeProjectPlan.startingRows}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">rows</p>
                </div>
              </div>
            </div>
          </div>

          {/* With shrinkage compensation */}
          {hasShrinkage && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                With Shrinkage Compensation
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                If your yarn shrinks, cast on more to hit your target after washing:
              </p>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="frosted-panel">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {compensatedStitches}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">adjusted stitches</p>
                </div>
                <div className="frosted-panel">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {compensatedRows}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">adjusted rows</p>
                </div>
              </div>
            </div>
          )}

          {/* Save to Library Button */}
          <div className="flex justify-end mt-6 pt-4 border-t border-border/30">
            {user ? (
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowReportGenerator(true)}
                  className="rounded-xl soft-press"
                >
                  <FileImage className="w-4 h-4 mr-2" />
                  生成样片报告
                </Button>
                <Button 
                  onClick={() => setSaveModalOpen(true)}
                  className="rounded-xl soft-press"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to My Yarn Library
                </Button>
              </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled className="rounded-xl">
                    <Save className="w-4 h-4 mr-2" />
                    Save to My Yarn Library
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sign in to save yarns</TooltipContent>
              </Tooltip>
            )}
          </div>
        </motion.div>

        {/* Integrated Yarn & Gauge Vault */}
        <YarnGaugeVault compact />

        {/* Smart Yarn Calculator */}
        <SmartYarnCalculator />
      </motion.div>

      {/* Cloud Save Modal with Folder Selection */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Save to My Yarn Library
            </DialogTitle>
            <DialogDescription>
              Save your current gauge data to the cloud.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="yarn-name">Yarn Name *</Label>
              <Input
                id="yarn-name"
                value={yarnName}
                onChange={(e) => setYarnName(e.target.value)}
                placeholder="e.g., Malabrigo Rios - Azul Profundo"
                autoFocus
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="yarn-brand">Brand</Label>
                <Input
                  id="yarn-brand"
                  value={yarnBrand}
                  onChange={(e) => setYarnBrand(e.target.value)}
                  placeholder="Malabrigo"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight</Label>
                <Select value={yarnWeight} onValueChange={(v) => setYarnWeight(v as YarnWeight)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lace">Lace</SelectItem>
                    <SelectItem value="fingering">Fingering</SelectItem>
                    <SelectItem value="sport">Sport</SelectItem>
                    <SelectItem value="dk">DK</SelectItem>
                    <SelectItem value="worsted">Worsted</SelectItem>
                    <SelectItem value="aran">Aran</SelectItem>
                    <SelectItem value="bulky">Bulky</SelectItem>
                    <SelectItem value="super_bulky">Super Bulky</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Save to Folder</Label>
              <Select 
                value={selectedFolderId || 'root'} 
                onValueChange={(v) => setSelectedFolderId(v === 'root' ? null : v)}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">📁 Root (no folder)</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      📂 {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gauge preview */}
            <div className="frosted-panel">
              <p className="text-xs text-muted-foreground mb-2">Current Gauge (will be saved):</p>
              <p className="text-sm font-medium">
                {safeGaugeData.postWashStitchDensity.toFixed(1)} st/cm × {safeGaugeData.postWashRowDensity.toFixed(1)} rows/cm
              </p>
              <p className="text-xs text-muted-foreground">
                Swatch: {safeSwatchData.postWashWidth} × {safeSwatchData.postWashHeight} cm
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)} className="rounded-2xl">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveToCloud}
              disabled={!yarnName.trim() || createEntry.isPending}
              className="rounded-2xl"
            >
              {createEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Yarn
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Swatch Report Generator */}
      <SwatchReportGenerator
        open={showReportGenerator}
        onOpenChange={setShowReportGenerator}
        swatchData={safeSwatchData}
        gaugeData={safeGaugeData}
        yarnName={yarnName}
        yarnBrand={yarnBrand}
      />
    </motion.div>
  );
}
