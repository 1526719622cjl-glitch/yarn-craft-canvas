import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Ruler, Calculator, TrendingUp, TrendingDown, Target, Undo, Redo, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { SmartYarnCalculator } from '@/components/swatch/SmartYarnCalculator';
import { AdvancedGaugeCalculator } from '@/components/swatch/AdvancedGaugeCalculator';
import { YarnLibrarySaveModal } from '@/components/swatch/YarnLibrarySaveModal';
import { YarnGaugeVault } from '@/components/swatch/YarnGaugeVault';
import { useUndoRedo, useUndoRedoKeyboard } from '@/hooks/useUndoRedo';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

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
    yarnLibrary,
    setSwatchData, 
    setProjectPlan,
    calculateGauge,
    saveToYarnLibrary,
    loadFromYarnLibrary,
  } = useYarnCluesStore();

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const { user } = useAuth();

  // Safe defaults + null/NaN normalization (prevents `.toFixed()` on null)
  const num = (value: unknown, fallback: number) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  };

  const safeGaugeData = {
    stitchDensity: num(gaugeData?.stitchDensity, 0),
    rowDensity: num(gaugeData?.rowDensity, 0),
    gaugeRatio: num(gaugeData?.gaugeRatio, 1),
    shrinkageStitches: num(gaugeData?.shrinkageStitches, 0),
    shrinkageRows: num(gaugeData?.shrinkageRows, 0),
  };

  const safeProjectPlan = {
    targetWidth: num(projectPlan?.targetWidth, 50),
    targetHeight: num(projectPlan?.targetHeight, 60),
    startingStitches: num(projectPlan?.startingStitches, 0),
    startingRows: num(projectPlan?.startingRows, 0),
  };

  const safeSwatchData = {
    swatchWidth: num(swatchData?.swatchWidth, 10),
    swatchHeight: num(swatchData?.swatchHeight, 10),
    stitchesPreWash: num(swatchData?.stitchesPreWash, 20),
    rowsPreWash: num(swatchData?.rowsPreWash, 28),
    stitchesPostWash: num(swatchData?.stitchesPostWash, 20),
    rowsPostWash: num(swatchData?.rowsPostWash, 28),
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

  const handleSaveToLibrary = (name: string) => {
    saveToYarnLibrary(name);
  };

  const handleLoadFromLibrary = (id: string) => {
    loadFromYarnLibrary(id);
  };

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

      {/* Calculator Mode Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <TabsList className="grid w-[400px] grid-cols-2 rounded-2xl">
              <TabsTrigger value="basic" className="rounded-xl">Basic Gauge</TabsTrigger>
              <TabsTrigger value="advanced" className="rounded-xl">Shrinkage Calculator</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic" className="space-y-6 mt-0">
            {/* Swatch Dimensions */}
            <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-yarn-cream/50 flex items-center justify-center">
                  <span className="text-sm">📐</span>
                </div>
                <h2 className="text-lg font-medium">Swatch Dimensions</h2>
                <span className="text-xs text-muted-foreground ml-2">(Flexible - any size)</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="swatch-width" className="text-sm text-muted-foreground">Swatch Width (cm)</Label>
                  <Input
                    id="swatch-width"
                    type="number"
                    value={safeSwatchData.swatchWidth}
                    onChange={(e) => handleSwatchChange({ swatchWidth: Number(e.target.value) })}
                    className="input-glass h-12 text-lg font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swatch-height" className="text-sm text-muted-foreground">Swatch Height (cm)</Label>
                  <Input
                    id="swatch-height"
                    type="number"
                    value={safeSwatchData.swatchHeight}
                    onChange={(e) => handleSwatchChange({ swatchHeight: Number(e.target.value) })}
                    className="input-glass h-12 text-lg font-medium"
                  />
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pre-Wash Swatch */}
              <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-yarn-honey/30 flex items-center justify-center">
                    <span className="text-sm">🧶</span>
                  </div>
                  <h2 className="text-lg font-medium">Pre-Wash Measurements</h2>
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
              </motion.div>

              {/* Post-Wash Swatch */}
              <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-yarn-sky/30 flex items-center justify-center">
                    <span className="text-sm">💧</span>
                  </div>
                  <h2 className="text-lg font-medium">Post-Wash Measurements</h2>
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
              </motion.div>
            </div>

            {/* Gauge Results */}
            <motion.div variants={itemVariants} className="glass-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-xl bg-yarn-rose/30 flex items-center justify-center">
                  <Calculator className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-lg font-medium">Calculated Gauge</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="frosted-panel text-center">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {safeGaugeData.stitchDensity.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">stitches/cm</p>
                </div>
                <div className="frosted-panel text-center">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {safeGaugeData.rowDensity.toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">rows/cm</p>
                </div>
                <div className="frosted-panel text-center">
                  <p className="text-3xl font-display font-semibold text-primary">
                    {safeGaugeData.gaugeRatio.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">gauge ratio</p>
                </div>
                <div className="frosted-panel text-center">
                  <div className="flex items-center justify-center gap-1">
                    {safeGaugeData.shrinkageStitches >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-secondary-foreground" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-destructive" />
                    )}
                    <p className="text-3xl font-display font-semibold text-primary">
                      {Math.abs(safeGaugeData.shrinkageStitches).toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {safeGaugeData.shrinkageStitches >= 0 ? 'growth' : 'shrinkage'}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Project Planner */}
            <motion.div variants={itemVariants} className="glass-card p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
                    <Target className="w-4 h-4 text-primary" />
                  </div>
                  <h2 className="text-lg font-medium">Project Planner</h2>
                </div>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Target Dimensions</h3>
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
                  <h3 className="text-sm font-medium text-muted-foreground">Starting Count</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="frosted-panel text-center">
                      <p className="text-3xl font-display font-semibold text-primary">
                        {safeProjectPlan.startingStitches}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">cast on stitches</p>
                    </div>
                    <div className="frosted-panel text-center">
                      <p className="text-3xl font-display font-semibold text-primary">
                        {safeProjectPlan.startingRows}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">total rows</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save to Library Button */}
              <div className="flex justify-end mt-6 pt-4 border-t border-border/30">
                <Button 
                  onClick={() => setSaveModalOpen(true)}
                  className="rounded-xl soft-press"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save to My Yarn
                </Button>
              </div>
            </motion.div>

            {/* Integrated Yarn & Gauge Vault */}
            <YarnGaugeVault compact />

            {/* Smart Yarn Calculator */}
            <SmartYarnCalculator />
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 mt-0">
            <AdvancedGaugeCalculator />
            <SmartYarnCalculator />
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Save Modal */}
      <YarnLibrarySaveModal
        open={saveModalOpen}
        onOpenChange={setSaveModalOpen}
        onSave={handleSaveToLibrary}
      />
    </motion.div>
  );
}
