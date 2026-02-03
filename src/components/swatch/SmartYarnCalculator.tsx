import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package, Calculator, ToggleLeft, ToggleRight, Info, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface YarnCalculation {
  ballsNeeded: number | null;
  totalMeters: number | null;
  metersExtra: number | null;
  scenario: 'grams-only' | 'grams-with-length' | 'meters-only' | 'incomplete';
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export function SmartYarnCalculator() {
  // Group A: Yarn Specs (all optional)
  const [ballWeight, setBallWeight] = useState<string>('');
  const [ballLength, setBallLength] = useState<string>('');
  
  // Group B: Requirements (at least one needed)
  const [totalGrams, setTotalGrams] = useState<string>('');
  const [totalMeters, setTotalMeters] = useState<string>('');
  
  // Buffer toggle
  const [includeBuffer, setIncludeBuffer] = useState(true);

  // Smart calculation based on available data
  const calculation = useMemo((): YarnCalculation => {
    const ballWt = parseFloat(ballWeight) || 0;
    const ballLen = parseFloat(ballLength) || 0;
    const reqGrams = parseFloat(totalGrams) || 0;
    const reqMeters = parseFloat(totalMeters) || 0;
    const bufferMultiplier = includeBuffer ? 1.1 : 1;

    // Scenario 1: User enters Total Grams and Ball Weight
    if (reqGrams > 0 && ballWt > 0) {
      const adjustedGrams = reqGrams * bufferMultiplier;
      const balls = Math.ceil(adjustedGrams / ballWt);
      
      // Scenario 2: Also has Ball Length
      if (ballLen > 0) {
        const totalLen = balls * ballLen;
        return {
          ballsNeeded: balls,
          totalMeters: Math.round(totalLen),
          metersExtra: Math.round(totalLen - (reqGrams / ballWt * ballLen)),
          scenario: 'grams-with-length',
        };
      }
      
      return {
        ballsNeeded: balls,
        totalMeters: null,
        metersExtra: null,
        scenario: 'grams-only',
      };
    }
    
    // Scenario 3: User only enters Meters
    if (reqMeters > 0 && ballLen > 0) {
      const adjustedMeters = reqMeters * bufferMultiplier;
      const balls = Math.ceil(adjustedMeters / ballLen);
      return {
        ballsNeeded: balls,
        totalMeters: balls * ballLen,
        metersExtra: Math.round((balls * ballLen) - reqMeters),
        scenario: 'meters-only',
      };
    }

    return {
      ballsNeeded: null,
      totalMeters: null,
      metersExtra: null,
      scenario: 'incomplete',
    };
  }, [ballWeight, ballLength, totalGrams, totalMeters, includeBuffer]);

  const hasResults = calculation.scenario !== 'incomplete';

  return (
    <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yarn-honey/30 flex items-center justify-center">
            <Package className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Smart Yarn Calculator</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Flexible calculator - fill in what you know. No required fields!</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="buffer-toggle" className="text-sm text-muted-foreground">
            +10% Buffer
          </Label>
          <Switch
            id="buffer-toggle"
            checked={includeBuffer}
            onCheckedChange={setIncludeBuffer}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          {/* Group A: Yarn Specs */}
          <div className="frosted-panel space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              Yarn Specs
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ball-weight" className="text-xs text-muted-foreground">
                  Grams/Ball
                </Label>
                <Input
                  id="ball-weight"
                  type="number"
                  value={ballWeight}
                  onChange={(e) => setBallWeight(e.target.value)}
                  placeholder="Optional"
                  className="input-glass h-10"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ball-length" className="text-xs text-muted-foreground">
                  Meters/Ball
                </Label>
                <Input
                  id="ball-length"
                  type="number"
                  value={ballLength}
                  onChange={(e) => setBallLength(e.target.value)}
                  placeholder="Optional"
                  className="input-glass h-10"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Group B: Requirements */}
          <div className="frosted-panel space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="w-3.5 h-3.5" />
              Project Requirement
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="total-grams" className="text-xs text-muted-foreground">
                  Total Grams
                </Label>
                <Input
                  id="total-grams"
                  type="number"
                  value={totalGrams}
                  onChange={(e) => setTotalGrams(e.target.value)}
                  placeholder="e.g., 850"
                  className="input-glass h-10"
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-meters-req" className="text-xs text-muted-foreground">
                  OR Total Meters
                </Label>
                <Input
                  id="total-meters-req"
                  type="number"
                  value={totalMeters}
                  onChange={(e) => setTotalMeters(e.target.value)}
                  placeholder="e.g., 2500"
                  className="input-glass h-10"
                  min={0}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {hasResults ? (
            <>
              <div className="frosted-panel text-center py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">You need</span>
                </div>
                <motion.p 
                  key={calculation.ballsNeeded}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-5xl font-display font-bold text-primary"
                >
                  {calculation.ballsNeeded}
                </motion.p>
                <p className="text-lg text-muted-foreground mt-1">
                  ball{calculation.ballsNeeded !== 1 ? 's' : ''} of yarn
                </p>
                {includeBuffer && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary/70 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    Includes 10% buffer
                  </span>
                )}
              </div>

              {calculation.totalMeters !== null && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="frosted-panel text-center py-3">
                    <motion.p 
                      key={calculation.totalMeters}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xl font-semibold text-foreground"
                    >
                      {calculation.totalMeters}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">total meters</p>
                  </div>
                  <div className="frosted-panel text-center py-3">
                    <motion.p 
                      key={calculation.metersExtra}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xl font-semibold text-foreground"
                    >
                      +{calculation.metersExtra}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">meters extra</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="frosted-panel text-center py-12">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                Enter yarn specs or project requirements to calculate
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                No required fields — fill in what you know!
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
