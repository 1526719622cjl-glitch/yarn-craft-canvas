import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Droplets, Ruler, ArrowRight, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';
import { useProjectSpecs } from '@/hooks/useYarnVault';
import { useToast } from '@/hooks/use-toast';

interface GaugeInputs {
  // Pre-wash (in 10x10cm)
  stitchesPer10cm: number;
  rowsPer10cm: number;
  // Post-wash dimensions
  postWashWidth: number;
  postWashHeight: number;
  // Target project size
  targetWidth: number;
  targetHeight: number;
}

interface CalculatedResults {
  // Shrinkage factors
  widthShrinkage: number; // percentage
  heightShrinkage: number; // percentage
  widthFactor: number; // multiplier
  heightFactor: number; // multiplier
  // Adjusted gauge
  adjustedStitchesPer10cm: number;
  adjustedRowsPer10cm: number;
  // Final cast-on
  castOnStitches: number;
  totalRows: number;
  // With shrinkage compensation
  adjustedCastOnStitches: number;
  adjustedTotalRows: number;
}

export function AdvancedGaugeCalculator() {
  const { user } = useAuth();
  const { createSpec } = useProjectSpecs();
  const { toast } = useToast();

  const [inputs, setInputs] = useState<GaugeInputs>({
    stitchesPer10cm: 20,
    rowsPer10cm: 28,
    postWashWidth: 10, // Same as pre-wash = no shrinkage
    postWashHeight: 10,
    targetWidth: 50,
    targetHeight: 60,
  });

  const [includeBuffer, setIncludeBuffer] = useState(false);
  const [projectName, setProjectName] = useState('');

  // Calculate all derived values
  const results = useMemo<CalculatedResults>(() => {
    const { stitchesPer10cm, rowsPer10cm, postWashWidth, postWashHeight, targetWidth, targetHeight } = inputs;

    // Shrinkage calculations (compared to original 10cm)
    const widthShrinkage = ((10 - postWashWidth) / 10) * 100;
    const heightShrinkage = ((10 - postWashHeight) / 10) * 100;

    // Shrinkage factors (how much bigger we need to make it)
    const widthFactor = 10 / postWashWidth;
    const heightFactor = 10 / postWashHeight;

    // Adjusted gauge (what the stitches will be after washing)
    const adjustedStitchesPer10cm = stitchesPer10cm * widthFactor;
    const adjustedRowsPer10cm = rowsPer10cm * heightFactor;

    // Basic cast-on (without shrinkage compensation)
    const castOnStitches = Math.round((targetWidth / 10) * stitchesPer10cm);
    const totalRows = Math.round((targetHeight / 10) * rowsPer10cm);

    // Adjusted cast-on (with shrinkage compensation)
    const adjustedCastOnStitches = Math.round(castOnStitches * widthFactor);
    const adjustedTotalRows = Math.round(totalRows * heightFactor);

    return {
      widthShrinkage,
      heightShrinkage,
      widthFactor,
      heightFactor,
      adjustedStitchesPer10cm,
      adjustedRowsPer10cm,
      castOnStitches,
      totalRows,
      adjustedCastOnStitches,
      adjustedTotalRows,
    };
  }, [inputs]);

  const handleInputChange = (field: keyof GaugeInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value || 0 }));
  };

  const handleSaveProject = () => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save project specs',
        variant: 'destructive',
      });
      return;
    }

    if (!projectName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a project name',
        variant: 'destructive',
      });
      return;
    }

    createSpec.mutate({
      name: projectName,
      yarn_entry_id: null,
      target_width_cm: inputs.targetWidth,
      target_height_cm: inputs.targetHeight,
      total_stitches: results.castOnStitches,
      total_rows: results.totalRows,
      adjusted_stitches: results.adjustedCastOnStitches,
      adjusted_rows: results.adjustedTotalRows,
      width_shrinkage_factor: results.widthFactor,
      height_shrinkage_factor: results.heightFactor,
      total_meters_needed: null,
      total_grams_needed: null,
      balls_needed: null,
      notes: null,
    });

    setProjectName('');
  };

  const hasShrinkage = results.widthShrinkage !== 0 || results.heightShrinkage !== 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 space-y-6"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-yarn-sky/30 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-medium">Before & After Wash Calculator</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pre-Wash Gauge */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Ruler className="w-4 h-4" />
            Pre-Wash Gauge (in 10×10cm)
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Stitches</Label>
              <Input
                type="number"
                value={inputs.stitchesPer10cm || ''}
                onChange={(e) => handleInputChange('stitchesPer10cm', Number(e.target.value))}
                className="input-glass h-12 text-lg font-medium"
                placeholder="20"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Rows</Label>
              <Input
                type="number"
                value={inputs.rowsPer10cm || ''}
                onChange={(e) => handleInputChange('rowsPer10cm', Number(e.target.value))}
                className="input-glass h-12 text-lg font-medium"
                placeholder="28"
              />
            </div>
          </div>
        </div>

        {/* Post-Wash Dimensions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Droplets className="w-4 h-4" />
            Post-Wash Swatch Size (cm)
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Width</Label>
              <Input
                type="number"
                step="0.1"
                value={inputs.postWashWidth || ''}
                onChange={(e) => handleInputChange('postWashWidth', Number(e.target.value))}
                className="input-glass h-12 text-lg font-medium"
                placeholder="9.5"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height</Label>
              <Input
                type="number"
                step="0.1"
                value={inputs.postWashHeight || ''}
                onChange={(e) => handleInputChange('postWashHeight', Number(e.target.value))}
                className="input-glass h-12 text-lg font-medium"
                placeholder="10.2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Shrinkage Results */}
      {hasShrinkage && (
        <div className="p-4 rounded-2xl bg-yarn-honey/20 border border-yarn-honey/30">
          <h3 className="text-sm font-medium mb-3">Shrinkage Analysis</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {results.widthShrinkage > 0 ? '-' : '+'}{Math.abs(results.widthShrinkage).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Width {results.widthShrinkage > 0 ? 'shrinkage' : 'stretch'}</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {results.heightShrinkage > 0 ? '-' : '+'}{Math.abs(results.heightShrinkage).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Height {results.heightShrinkage > 0 ? 'shrinkage' : 'stretch'}</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-secondary-foreground">
                ×{results.widthFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Width factor</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-secondary-foreground">
                ×{results.heightFactor.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">Height factor</p>
            </div>
          </div>
        </div>
      )}

      {/* Target Dimensions */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground">Target Project Dimensions (cm)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Finished Width</Label>
            <Input
              type="number"
              value={inputs.targetWidth || ''}
              onChange={(e) => handleInputChange('targetWidth', Number(e.target.value))}
              className="input-glass h-12 text-lg font-medium"
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Finished Height</Label>
            <Input
              type="number"
              value={inputs.targetHeight || ''}
              onChange={(e) => handleInputChange('targetHeight', Number(e.target.value))}
              className="input-glass h-12 text-lg font-medium"
              placeholder="60"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="frosted-panel">
          <h3 className="text-sm font-medium mb-3">Without Shrinkage Compensation</h3>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-display font-semibold text-muted-foreground">
                {results.castOnStitches}
              </p>
              <p className="text-xs text-muted-foreground">cast on stitches</p>
            </div>
            <div>
              <p className="text-3xl font-display font-semibold text-muted-foreground">
                {results.totalRows}
              </p>
              <p className="text-xs text-muted-foreground">total rows</p>
            </div>
          </div>
        </div>

        <div className="frosted-panel bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-3">
            <ArrowRight className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-medium">With Shrinkage Compensation</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-3xl font-display font-semibold text-primary">
                {results.adjustedCastOnStitches}
              </p>
              <p className="text-xs text-muted-foreground">cast on stitches</p>
            </div>
            <div>
              <p className="text-3xl font-display font-semibold text-primary">
                {results.adjustedTotalRows}
              </p>
              <p className="text-xs text-muted-foreground">total rows</p>
            </div>
          </div>
        </div>
      </div>

      {/* Buffer Toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30">
        <div>
          <p className="text-sm font-medium">Include 10% Safety Buffer</p>
          <p className="text-xs text-muted-foreground">Add extra stitches/rows for blocking variations</p>
        </div>
        <Switch checked={includeBuffer} onCheckedChange={setIncludeBuffer} />
      </div>

      {includeBuffer && (
        <div className="p-4 rounded-2xl bg-yarn-sage/20 text-center">
          <p className="text-sm text-muted-foreground mb-2">With 10% buffer:</p>
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {Math.ceil(results.adjustedCastOnStitches * 1.1)}
              </p>
              <p className="text-xs text-muted-foreground">stitches</p>
            </div>
            <div>
              <p className="text-2xl font-display font-semibold text-primary">
                {Math.ceil(results.adjustedTotalRows * 1.1)}
              </p>
              <p className="text-xs text-muted-foreground">rows</p>
            </div>
          </div>
        </div>
      )}

      {/* Save Project */}
      {user && (
        <div className="flex gap-4 pt-4 border-t border-border/30">
          <Input
            placeholder="Project name..."
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="input-glass flex-1"
          />
          <Button
            onClick={handleSaveProject}
            disabled={!projectName.trim() || createSpec.isPending}
            className="rounded-xl soft-press"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Project Specs
          </Button>
        </div>
      )}
    </motion.div>
  );
}
