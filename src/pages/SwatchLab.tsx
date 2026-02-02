import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Ruler, Calculator, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect } from 'react';

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
    calculateGauge 
  } = useYarnCluesStore();

  useEffect(() => {
    calculateGauge();
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-sage/30 flex items-center justify-center">
            <Ruler className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">The Swatch Lab</h1>
            <p className="text-muted-foreground">Calculate your gauge and plan your project</p>
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
            <h2 className="text-lg font-medium">Pre-Wash Swatch (10×10cm)</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stitches-pre" className="text-sm text-muted-foreground">Stitches</Label>
              <Input
                id="stitches-pre"
                type="number"
                value={swatchData.stitchesPreWash}
                onChange={(e) => setSwatchData({ stitchesPreWash: Number(e.target.value) })}
                className="input-glass h-12 text-lg font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rows-pre" className="text-sm text-muted-foreground">Rows</Label>
              <Input
                id="rows-pre"
                type="number"
                value={swatchData.rowsPreWash}
                onChange={(e) => setSwatchData({ rowsPreWash: Number(e.target.value) })}
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
            <h2 className="text-lg font-medium">Post-Wash Swatch (10×10cm)</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stitches-post" className="text-sm text-muted-foreground">Stitches</Label>
              <Input
                id="stitches-post"
                type="number"
                value={swatchData.stitchesPostWash}
                onChange={(e) => setSwatchData({ stitchesPostWash: Number(e.target.value) })}
                className="input-glass h-12 text-lg font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rows-post" className="text-sm text-muted-foreground">Rows</Label>
              <Input
                id="rows-post"
                type="number"
                value={swatchData.rowsPostWash}
                onChange={(e) => setSwatchData({ rowsPostWash: Number(e.target.value) })}
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
              {gaugeData.stitchDensity.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">stitches/cm</p>
          </div>
          <div className="frosted-panel text-center">
            <p className="text-3xl font-display font-semibold text-primary">
              {gaugeData.rowDensity.toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">rows/cm</p>
          </div>
          <div className="frosted-panel text-center">
            <p className="text-3xl font-display font-semibold text-primary">
              {gaugeData.gaugeRatio.toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">gauge ratio</p>
          </div>
          <div className="frosted-panel text-center">
            <div className="flex items-center justify-center gap-1">
              {gaugeData.shrinkageStitches >= 0 ? (
                <TrendingUp className="w-4 h-4 text-secondary-foreground" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <p className="text-3xl font-display font-semibold text-primary">
                {Math.abs(gaugeData.shrinkageStitches).toFixed(1)}%
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {gaugeData.shrinkageStitches >= 0 ? 'growth' : 'shrinkage'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Project Planner */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
            <Target className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Project Planner</h2>
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
                  value={projectPlan.targetWidth}
                  onChange={(e) => setProjectPlan({ targetWidth: Number(e.target.value) })}
                  className="input-glass h-12 text-lg font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target-height" className="text-sm text-muted-foreground">Height (cm)</Label>
                <Input
                  id="target-height"
                  type="number"
                  value={projectPlan.targetHeight}
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
                  {projectPlan.startingStitches}
                </p>
                <p className="text-sm text-muted-foreground mt-1">cast on stitches</p>
              </div>
              <div className="frosted-panel text-center">
                <p className="text-3xl font-display font-semibold text-primary">
                  {projectPlan.startingRows}
                </p>
                <p className="text-sm text-muted-foreground mt-1">total rows</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
