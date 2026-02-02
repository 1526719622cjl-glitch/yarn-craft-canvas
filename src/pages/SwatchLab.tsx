import { motion } from 'framer-motion';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import { Ruler, Calculator, TrendingUp, TrendingDown, Target, Save, Library, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    deleteFromYarnLibrary
  } = useYarnCluesStore();

  const [yarnName, setYarnName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  useEffect(() => {
    calculateGauge();
  }, []);

  const handleSaveYarn = () => {
    if (yarnName.trim()) {
      saveToYarnLibrary(yarnName.trim());
      setYarnName('');
      setSaveDialogOpen(false);
    }
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

          {/* Yarn Library Actions */}
          <div className="flex gap-2">
            {yarnLibrary.length > 0 && (
              <Select onValueChange={loadFromYarnLibrary}>
                <SelectTrigger className="w-48 rounded-2xl">
                  <Library className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Load Saved Yarn" />
                </SelectTrigger>
                <SelectContent>
                  {yarnLibrary.map((yarn) => (
                    <SelectItem key={yarn.id} value={yarn.id}>
                      {yarn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-2xl soft-press">
                  <Save className="w-4 h-4 mr-2" />
                  Save to Library
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle>Save Yarn to Library</DialogTitle>
                  <DialogDescription>
                    Save the current gauge data for future use.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="yarn-name">Yarn Name</Label>
                  <Input
                    id="yarn-name"
                    value={yarnName}
                    onChange={(e) => setYarnName(e.target.value)}
                    placeholder="e.g., My Blue Merino"
                    className="mt-2"
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="rounded-2xl">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveYarn} className="rounded-2xl">
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>

      {/* Swatch Dimensions */}
      <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-yarn-cream/50 flex items-center justify-center">
            <span className="text-sm">📐</span>
          </div>
          <h2 className="text-lg font-medium">Swatch Dimensions</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="swatch-width" className="text-sm text-muted-foreground">Swatch Width (cm)</Label>
            <Input
              id="swatch-width"
              type="number"
              value={swatchData.swatchWidth}
              onChange={(e) => setSwatchData({ swatchWidth: Number(e.target.value) })}
              className="input-glass h-12 text-lg font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="swatch-height" className="text-sm text-muted-foreground">Swatch Height (cm)</Label>
            <Input
              id="swatch-height"
              type="number"
              value={swatchData.swatchHeight}
              onChange={(e) => setSwatchData({ swatchHeight: Number(e.target.value) })}
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
                value={swatchData.stitchesPreWash}
                onChange={(e) => setSwatchData({ stitchesPreWash: Number(e.target.value) })}
                className="input-glass h-12 text-lg font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rows-pre" className="text-sm text-muted-foreground">Row Count</Label>
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
            <h2 className="text-lg font-medium">Post-Wash Measurements</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stitches-post" className="text-sm text-muted-foreground">Stitch Count</Label>
              <Input
                id="stitches-post"
                type="number"
                value={swatchData.stitchesPostWash}
                onChange={(e) => setSwatchData({ stitchesPostWash: Number(e.target.value) })}
                className="input-glass h-12 text-lg font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rows-post" className="text-sm text-muted-foreground">Row Count</Label>
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

      {/* Yarn Library */}
      {yarnLibrary.length > 0 && (
        <motion.div variants={itemVariants} className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
              <Library className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-lg font-medium">Saved Yarns</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {yarnLibrary.map((yarn) => (
              <motion.div
                key={yarn.id}
                className="frosted-panel space-y-2"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-foreground">{yarn.name}</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteFromYarnLibrary(yarn.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Density: {yarn.gaugeData.stitchDensity.toFixed(1)} st/cm × {yarn.gaugeData.rowDensity.toFixed(1)} rows/cm</p>
                  <p>Ratio: {yarn.gaugeData.gaugeRatio.toFixed(2)}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadFromYarnLibrary(yarn.id)}
                  className="w-full rounded-xl"
                >
                  Load
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

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
