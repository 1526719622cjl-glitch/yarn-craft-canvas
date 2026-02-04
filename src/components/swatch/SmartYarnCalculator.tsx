import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calculator, Info, Sparkles, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface YarnSpec {
  id: string;
  label: string;
  ballWeight: string;
  ballLength: string;
}

interface YarnCalculation {
  ballsNeeded: number | null;
  totalMeters: number | null;
  metersExtra: number | null;
  scenario: 'grams-only' | 'grams-with-length' | 'meters-only' | 'incomplete';
  perYarn?: { label: string; balls: number; meters: number }[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const createEmptyYarn = (index: number): YarnSpec => ({
  id: crypto.randomUUID(),
  label: index === 0 ? 'Yarn A (Primary)' : `Yarn ${String.fromCharCode(65 + index)}`,
  ballWeight: '',
  ballLength: '',
});

export function SmartYarnCalculator() {
  // Multi-yarn specs
  const [yarns, setYarns] = useState<YarnSpec[]>([createEmptyYarn(0)]);
  
  // Requirements (at least one needed)
  const [totalGrams, setTotalGrams] = useState<string>('');
  const [totalMeters, setTotalMeters] = useState<string>('');
  
  // Buffer toggle
  const [includeBuffer, setIncludeBuffer] = useState(true);

  // Add a new yarn slot
  const handleAddYarn = () => {
    if (yarns.length < 4) {
      setYarns([...yarns, createEmptyYarn(yarns.length)]);
    }
  };

  // Remove a yarn slot
  const handleRemoveYarn = (id: string) => {
    if (yarns.length > 1) {
      setYarns(yarns.filter(y => y.id !== id));
    }
  };

  // Update a yarn spec
  const handleYarnChange = (id: string, field: 'ballWeight' | 'ballLength', value: string) => {
    setYarns(yarns.map(y => 
      y.id === id ? { ...y, [field]: value } : y
    ));
  };

  // Smart calculation based on available data
  const calculation = useMemo((): YarnCalculation => {
    const reqGrams = parseFloat(totalGrams) || 0;
    const reqMeters = parseFloat(totalMeters) || 0;
    const bufferMultiplier = includeBuffer ? 1.1 : 1;

    // For multi-yarn: calculate per-yarn requirements
    const validYarns = yarns.filter(y => {
      const wt = parseFloat(y.ballWeight) || 0;
      const len = parseFloat(y.ballLength) || 0;
      return wt > 0 || len > 0;
    });

    if (validYarns.length === 0) {
      return { ballsNeeded: null, totalMeters: null, metersExtra: null, scenario: 'incomplete' };
    }

    // Single yarn mode (backward compatible)
    if (yarns.length === 1) {
      const ballWt = parseFloat(yarns[0].ballWeight) || 0;
      const ballLen = parseFloat(yarns[0].ballLength) || 0;

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
    }

    // Multi-yarn mode: split requirements evenly or by ratio
    if (yarns.length > 1) {
      const perYarnResults: { label: string; balls: number; meters: number }[] = [];
      let totalBalls = 0;
      let totalLen = 0;

      // Each yarn held together needs the FULL target requirement
      // When holding 2 yarns together, you need 500m of EACH yarn, not 250m each
      
      yarns.forEach((yarn) => {
        const ballWt = parseFloat(yarn.ballWeight) || 0;
        const ballLen = parseFloat(yarn.ballLength) || 0;
        
        if (reqGrams > 0 && ballWt > 0) {
          // Full grams requirement per yarn (not split)
          const yarnGrams = reqGrams * bufferMultiplier;
          const balls = Math.ceil(yarnGrams / ballWt);
          const meters = ballLen > 0 ? balls * ballLen : 0;
          
          perYarnResults.push({ label: yarn.label, balls, meters: Math.round(meters) });
          totalBalls += balls;
          totalLen += meters;
        } else if (reqMeters > 0 && ballLen > 0) {
          // Full meters requirement per yarn (not split)
          const yarnMeters = reqMeters * bufferMultiplier;
          const balls = Math.ceil(yarnMeters / ballLen);
          
          perYarnResults.push({ label: yarn.label, balls, meters: Math.round(balls * ballLen) });
          totalBalls += balls;
          totalLen += balls * ballLen;
        }
      });

      if (perYarnResults.length > 0) {
        return {
          ballsNeeded: totalBalls,
          totalMeters: Math.round(totalLen),
          metersExtra: reqMeters > 0 ? Math.round(totalLen - reqMeters) : null,
          scenario: reqGrams > 0 ? 'grams-with-length' : 'meters-only',
          perYarn: perYarnResults,
        };
      }
    }

    return {
      ballsNeeded: null,
      totalMeters: null,
      metersExtra: null,
      scenario: 'incomplete',
    };
  }, [yarns, totalGrams, totalMeters, includeBuffer]);

  const hasResults = calculation.scenario !== 'incomplete';
  const isMultiYarn = yarns.length > 1;

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
              <p>Flexible calculator - supports multiple yarns held together!</p>
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
          {/* Yarn Specs - Multi-yarn support */}
          <AnimatePresence mode="popLayout">
            {yarns.map((yarn, index) => (
              <motion.div
                key={yarn.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="frosted-panel space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Sparkles className="w-3.5 h-3.5" />
                    {yarn.label}
                  </div>
                  {yarns.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveYarn(yarn.id)}
                      className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Grams/Ball
                    </Label>
                    <Input
                      type="number"
                      value={yarn.ballWeight}
                      onChange={(e) => handleYarnChange(yarn.id, 'ballWeight', e.target.value)}
                      placeholder="e.g., 100"
                      className="input-glass h-10"
                      min={0}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Meters/Ball
                    </Label>
                    <Input
                      type="number"
                      value={yarn.ballLength}
                      onChange={(e) => handleYarnChange(yarn.id, 'ballLength', e.target.value)}
                      placeholder="e.g., 200"
                      className="input-glass h-10"
                      min={0}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Another Yarn Button */}
          {yarns.length < 4 && (
            <Button
              variant="outline"
              onClick={handleAddYarn}
              className="w-full rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Yarn (Held Together)
            </Button>
          )}

          {/* Requirements */}
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
                  <span className="text-sm text-muted-foreground">
                    {isMultiYarn ? 'Total needed' : 'You need'}
                  </span>
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

              {/* Per-yarn breakdown for multi-yarn */}
              {isMultiYarn && calculation.perYarn && (
                <div className="frosted-panel space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Per Yarn Breakdown:</p>
                  {calculation.perYarn.map((yarnResult) => (
                    <div key={yarnResult.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{yarnResult.label}</span>
                      <span className="font-medium">
                        {yarnResult.balls} ball{yarnResult.balls !== 1 ? 's' : ''}
                        {yarnResult.meters > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({yarnResult.meters}m)
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

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
                Add multiple yarns for held-together scenarios!
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
