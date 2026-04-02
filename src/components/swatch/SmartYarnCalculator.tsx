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
import { useI18n } from '@/i18n/useI18n';

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
  scenario: 'meters-primary' | 'grams-converted' | 'grams-only' | 'incomplete';
  perYarn?: { label: string; balls: number; meters: number }[];
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const createEmptyYarn = (index: number): YarnSpec => ({
  id: crypto.randomUUID(),
  label: index === 0 ? '线材1 (主线)' : `Yarn ${String.fromCharCode(65 + index)}`,
  ballWeight: '',
  ballLength: '',
});

export function SmartYarnCalculator() {
  const { t } = useI18n();
  const [yarns, setYarns] = useState<YarnSpec[]>([createEmptyYarn(0)]);
  const [totalGrams, setTotalGrams] = useState<string>('');
  const [totalMeters, setTotalMeters] = useState<string>('');
  const [includeBuffer, setIncludeBuffer] = useState(true);

  const handleAddYarn = () => {
    if (yarns.length < 4) {
      setYarns([...yarns, createEmptyYarn(yarns.length)]);
    }
  };

  const handleRemoveYarn = (id: string) => {
    if (yarns.length > 1) {
      setYarns(yarns.filter(y => y.id !== id));
    }
  };

  const handleYarnChange = (id: string, field: 'ballWeight' | 'ballLength', value: string) => {
    setYarns(yarns.map(y => 
      y.id === id ? { ...y, [field]: value } : y
    ));
  };

  // Corrected algorithm: prioritize meters, use grams as fallback
  const calculation = useMemo((): YarnCalculation => {
    const reqGrams = parseFloat(totalGrams) || 0;
    const reqMeters = parseFloat(totalMeters) || 0;
    const buffer = includeBuffer ? 1.1 : 1;

    const calcForYarn = (yarn: YarnSpec) => {
      const ballWt = parseFloat(yarn.ballWeight) || 0;
      const ballLen = parseFloat(yarn.ballLength) || 0;

      // Priority 1: Direct meters input + ball length
      if (reqMeters > 0 && ballLen > 0) {
        const balls = Math.ceil(reqMeters * buffer / ballLen);
        return { balls, meters: balls * ballLen, scenario: 'meters-primary' as const };
      }

      // Priority 2: Grams input + ball weight + ball length → convert to meters first
      if (reqGrams > 0 && ballWt > 0 && ballLen > 0) {
        const totalNeededMeters = (reqGrams / ballWt) * ballLen;
        const balls = Math.ceil(totalNeededMeters * buffer / ballLen);
        return { balls, meters: balls * ballLen, scenario: 'grams-converted' as const };
      }

      // Priority 3: Grams only (no length info)
      if (reqGrams > 0 && ballWt > 0) {
        const balls = Math.ceil(reqGrams * buffer / ballWt);
        return { balls, meters: 0, scenario: 'grams-only' as const };
      }

      return null;
    };

    if (yarns.length === 1) {
      const result = calcForYarn(yarns[0]);
      if (!result) return { ballsNeeded: null, totalMeters: null, metersExtra: null, scenario: 'incomplete' };
      
      const extra = result.scenario === 'meters-primary' 
        ? Math.round(result.meters - reqMeters)
        : result.scenario === 'grams-converted'
          ? Math.round(result.meters - (reqGrams / (parseFloat(yarns[0].ballWeight) || 1)) * (parseFloat(yarns[0].ballLength) || 0))
          : null;

      return {
        ballsNeeded: result.balls,
        totalMeters: result.meters > 0 ? Math.round(result.meters) : null,
        metersExtra: extra,
        scenario: result.scenario,
      };
    }

    // Multi-yarn
    const perYarnResults: { label: string; balls: number; meters: number }[] = [];
    let totalBalls = 0;
    let totalLen = 0;
    let mainScenario: YarnCalculation['scenario'] = 'incomplete';

    yarns.forEach((yarn) => {
      const result = calcForYarn(yarn);
      if (result) {
        perYarnResults.push({ label: yarn.label, balls: result.balls, meters: Math.round(result.meters) });
        totalBalls += result.balls;
        totalLen += result.meters;
        mainScenario = result.scenario;
      }
    });

    if (perYarnResults.length > 0) {
      return {
        ballsNeeded: totalBalls,
        totalMeters: totalLen > 0 ? Math.round(totalLen) : null,
        metersExtra: reqMeters > 0 ? Math.round(totalLen - reqMeters) : null,
        scenario: mainScenario,
        perYarn: perYarnResults,
      };
    }

    return { ballsNeeded: null, totalMeters: null, metersExtra: null, scenario: 'incomplete' };
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
          <h2 className="text-lg font-medium">{t('calc.title')}</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>米数是编织实际消耗的度量，克重为辅助换算。优先填入总需米数以获得更精确的结果。</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="buffer-toggle" className="text-sm text-muted-foreground">
            {t('calc.buffer')}
          </Label>
          <Switch id="buffer-toggle" checked={includeBuffer} onCheckedChange={setIncludeBuffer} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {yarns.map((yarn) => (
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
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveYarn(yarn.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('calc.gramsBall')}</Label>
                    <Input type="number" value={yarn.ballWeight} onChange={(e) => handleYarnChange(yarn.id, 'ballWeight', e.target.value)} placeholder="e.g., 100" className="input-glass h-10" min={0} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{t('calc.metersBall')}</Label>
                    <Input type="number" value={yarn.ballLength} onChange={(e) => handleYarnChange(yarn.id, 'ballLength', e.target.value)} placeholder="e.g., 200" className="input-glass h-10" min={0} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {yarns.length < 4 && (
            <Button variant="outline" onClick={handleAddYarn} className="w-full rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('calc.addYarn')}
            </Button>
          )}

          <div className="frosted-panel space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calculator className="w-3.5 h-3.5" />
              {t('calc.projectReq')}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="total-meters-req" className="text-xs text-muted-foreground">总需米数 (优先)</Label>
                <Input id="total-meters-req" type="number" value={totalMeters} onChange={(e) => setTotalMeters(e.target.value)} placeholder="e.g., 2500" className="input-glass h-10" min={0} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="total-grams" className="text-xs text-muted-foreground">或总需克重</Label>
                <Input id="total-grams" type="number" value={totalGrams} onChange={(e) => setTotalGrams(e.target.value)} placeholder="e.g., 850" className="input-glass h-10" min={0} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {hasResults ? (
            <>
              <div className="frosted-panel text-center py-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {isMultiYarn ? t('calc.totalNeeded') : t('calc.youNeed')}
                  </span>
                </div>
                <motion.p key={calculation.ballsNeeded} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-5xl font-display font-bold text-primary">
                  {calculation.ballsNeeded}
                </motion.p>
                <p className="text-lg text-muted-foreground mt-1">{t('calc.ballsOfYarn')}</p>
                {includeBuffer && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary/70 mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    {t('calc.includesBuffer')}
                  </span>
                )}
              </div>

              {isMultiYarn && calculation.perYarn && (
                <div className="frosted-panel space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">{t('calc.perYarnBreakdown')}</p>
                  {calculation.perYarn.map((yarnResult) => (
                    <div key={yarnResult.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{yarnResult.label}</span>
                      <span className="font-medium">
                        {yarnResult.balls} {t('calc.ballsOfYarn')}
                        {yarnResult.meters > 0 && (
                          <span className="text-muted-foreground ml-1">({yarnResult.meters}m)</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {calculation.totalMeters !== null && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="frosted-panel text-center py-3">
                    <motion.p key={calculation.totalMeters} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-semibold text-foreground">
                      {calculation.totalMeters}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">{t('calc.totalMeters')}</p>
                  </div>
                  <div className="frosted-panel text-center py-3">
                    <motion.p key={calculation.metersExtra} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-semibold text-foreground">
                      +{calculation.metersExtra ?? 0}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">{t('calc.metersExtra')}</p>
                  </div>
                </div>
              )}

              {calculation.scenario === 'grams-only' && (
                <div className="p-3 rounded-xl bg-yarn-honey/20 border border-yarn-honey/30">
                  <p className="text-xs text-muted-foreground">💡 提示：填入每球米数可获得更精确的估算结果</p>
                </div>
              )}
            </>
          ) : (
            <div className="frosted-panel text-center py-12">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">{t('calc.enterSpecs')}</p>
              <p className="text-xs text-muted-foreground/60 mt-2">米数是编织实际消耗的度量，优先填入总需米数</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
