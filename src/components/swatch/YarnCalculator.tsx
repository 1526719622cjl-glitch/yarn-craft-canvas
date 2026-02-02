import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Calculator, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface YarnCalculation {
  targetMeters: number;
  metersPerBall: number;
  totalMetersWithBuffer: number;
  ballsNeeded: number;
  bufferPercentage: number;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function YarnCalculator() {
  const [metersPerBall, setMetersPerBall] = useState<number>(200);
  const [targetMeters, setTargetMeters] = useState<number>(1000);
  const [bufferPercent, setBufferPercent] = useState<number>(10);

  const calculateBalls = (): YarnCalculation => {
    const totalMetersWithBuffer = targetMeters * (1 + bufferPercent / 100);
    const ballsNeeded = Math.ceil(totalMetersWithBuffer / metersPerBall);
    
    return {
      targetMeters,
      metersPerBall,
      totalMetersWithBuffer,
      ballsNeeded,
      bufferPercentage: bufferPercent,
    };
  };

  const calculation = calculateBalls();

  return (
    <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-yarn-honey/30 flex items-center justify-center">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <h2 className="text-lg font-medium">Yarn Calculator</h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-4 h-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Calculate how many balls of yarn you need for your project. Buffer percentage accounts for swatching and mistakes.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meters-per-ball" className="text-sm text-muted-foreground">
              Meters per Ball
            </Label>
            <Input
              id="meters-per-ball"
              type="number"
              value={metersPerBall}
              onChange={(e) => setMetersPerBall(Number(e.target.value) || 0)}
              className="input-glass h-12 text-lg font-medium"
              min={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-meters" className="text-sm text-muted-foreground">
              Target Meters (Project Total)
            </Label>
            <Input
              id="target-meters"
              type="number"
              value={targetMeters}
              onChange={(e) => setTargetMeters(Number(e.target.value) || 0)}
              className="input-glass h-12 text-lg font-medium"
              min={1}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm text-muted-foreground">
                Buffer Percentage
              </Label>
              <span className="text-sm font-medium text-primary">{bufferPercent}%</span>
            </div>
            <Slider
              value={[bufferPercent]}
              onValueChange={(values) => setBufferPercent(values[0])}
              max={30}
              min={0}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 10% for simple projects, 15-20% for complex patterns
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          <div className="frosted-panel text-center py-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Calculator className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">You need</span>
            </div>
            <p className="text-5xl font-display font-bold text-primary">
              {calculation.ballsNeeded}
            </p>
            <p className="text-lg text-muted-foreground mt-1">
              ball{calculation.ballsNeeded !== 1 ? 's' : ''} of yarn
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="frosted-panel text-center py-3">
              <p className="text-xl font-semibold text-foreground">
                {calculation.totalMetersWithBuffer.toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">meters (with buffer)</p>
            </div>
            <div className="frosted-panel text-center py-3">
              <p className="text-xl font-semibold text-foreground">
                {(calculation.ballsNeeded * metersPerBall - targetMeters).toFixed(0)}
              </p>
              <p className="text-xs text-muted-foreground">meters extra</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary/50"></span>
              Calculation includes {bufferPercent}% buffer using Math.ceil
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
