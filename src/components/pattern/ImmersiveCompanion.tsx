import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, Check, Volume2, VolumeX, X, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/i18n/useI18n';
import type { ParsedStep } from './AIParsePanel';
import type { PatternProgress } from '@/hooks/usePatternProgress';
import type { GaugeData } from './GaugeInputDialog';
import { PixelRowPreview } from './PixelRowPreview';
import type { RowPixelData } from './PixelRowPreview';
import { StepCounter } from './StepCounter';

interface ImmersiveCompanionProps {
  steps: ParsedStep[];
  imageUrl: string;
  progress: PatternProgress | null;
  percentage: number;
  estimatedTimeLeft: number | null;
  onAdvance: () => void;
  onGoBack: () => void;
  onCorrection: (step: number, text: string) => void;
  onClose: () => void;
  gauge?: GaugeData | null;
  pixelRows?: RowPixelData[];
}

function playCompletionSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function ImmersiveCompanion({
  steps,
  imageUrl,
  progress,
  percentage,
  estimatedTimeLeft,
  onAdvance,
  onGoBack,
  onCorrection,
  onClose,
  gauge,
  pixelRows = [],
}: ImmersiveCompanionProps) {
  const { t } = useI18n();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showGauge, setShowGauge] = useState(false);
  const currentStep = progress?.current_step || 0;
  const step = steps[currentStep];
  const corrections = progress?.corrections || {};

  const currentPixelRow = pixelRows.find((r) => r.row === step?.row) || null;

  const handleNext = () => {
    if (soundEnabled) playCompletionSound();
    onAdvance();
  };

  const handleStartEdit = () => {
    setEditText(corrections[currentStep] || step?.instruction || '');
    setEditing(true);
  };

  const handleSaveEdit = () => {
    onCorrection(currentStep, editText);
    setEditing(false);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onGoBack();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, currentStep]);

  if (!step) return null;

  const displayInstruction = corrections[currentStep] || step.instruction;

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const gaugeHint = gauge && step ? (() => {
    const stitchMatch = displayInstruction.match(/\b(\d+)\s*(st|sc|dc|hdc|tr|针)/i);
    if (!stitchMatch) return null;
    const stitches = parseInt(stitchMatch[1]);
    const widthCm = (stitches / gauge.stitchesPer10cm * 10).toFixed(1);
    return { stitches, widthCm };
  })() : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col"
    >
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
          <div>
            <p className="text-sm font-medium">
              {t('pattern.step')} {currentStep + 1} / {steps.length}
            </p>
            {estimatedTimeLeft != null && (
              <p className="text-xs text-muted-foreground">
                {t('pattern.estimatedTime')}: ~{formatTime(estimatedTimeLeft)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gauge && (
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowGauge(!showGauge)}>
              <Ruler className="w-3.5 h-3.5" />
              {gauge.stitchesPer10cm}针/{gauge.rowsPer10cm}行
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <span className="text-sm font-mono">{percentage}%</span>
        </div>
      </div>

      <AnimatePresence>
        {showGauge && gauge && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-primary/5 border-b border-primary/20"
          >
            <div className="flex items-center gap-6 px-6 py-2 text-sm">
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">{t('pattern.dimensionCalc')}</span>
              </div>
              {gauge.yarnName && <span className="text-primary font-medium">{gauge.yarnName}</span>}
              <span className="font-mono">
                {gauge.stitchesPer10cm} {t('yarn.stitchesPer10cm')} · {gauge.rowsPer10cm} {t('yarn.rowsPer10cm')}
              </span>
              {gaugeHint && <span className="ml-auto text-muted-foreground">≈ {gaugeHint.widthCm} cm</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Progress value={percentage} className="h-1 rounded-none" />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {step.anchorRegion && (
          <div className="lg:w-1/2 p-4 flex items-center justify-center bg-muted/10">
            <div className="relative max-w-full max-h-full overflow-hidden rounded-2xl">
              <img
                src={imageUrl}
                alt="Pattern region"
                className="max-h-[50vh] lg:max-h-[70vh] object-contain"
                style={{
                  clipPath: `inset(${step.anchorRegion.y}% ${100 - step.anchorRegion.x - step.anchorRegion.width}% ${100 - step.anchorRegion.y - step.anchorRegion.height}% ${step.anchorRegion.x}%)`,
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-lg space-y-6 w-full"
            >
              <p className="text-xs text-muted-foreground font-mono">R{step.row}</p>

              {editing ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[100px] text-lg text-center" />
                  <Button onClick={handleSaveEdit}>
                    <Check className="w-4 h-4 mr-1" />
                    {t('common.save')}
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-2xl lg:text-3xl font-medium leading-relaxed">{displayInstruction}</p>
                  {step.translatedInstruction && (
                    <p className="text-lg text-muted-foreground leading-relaxed">{step.translatedInstruction}</p>
                  )}
                  {gaugeHint && gauge && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-primary/70 font-mono">
                      ≈ {gaugeHint.widthCm} cm
                    </motion.p>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    <Edit3 className="w-3 h-3 mr-1" />
                    {t('pattern.correct')}
                  </Button>
                </>
              )}

              {step.anchorRegion && (
                <div className="mt-2 rounded-xl border border-border/50 p-2 bg-muted/20">
                  <p className="text-xs text-muted-foreground mb-2">{t('pattern.anchorCompare')}</p>
                  <img
                    src={imageUrl}
                    alt="Anchor compare"
                    className="w-full h-28 object-cover rounded-lg"
                    style={{
                      clipPath: `inset(${step.anchorRegion.y}% ${100 - step.anchorRegion.x - step.anchorRegion.width}% ${100 - step.anchorRegion.y - step.anchorRegion.height}% ${step.anchorRegion.x}%)`,
                    }}
                  />
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {currentPixelRow && (
            <div className="w-full max-w-lg">
              <PixelRowPreview rowData={currentPixelRow} />
            </div>
          )}

          <div className="flex items-center gap-6 mt-4">
            <Button variant="outline" size="lg" onClick={onGoBack} disabled={currentStep <= 0}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button size="lg" onClick={handleNext} disabled={currentStep >= steps.length - 1} className="px-12">
              {currentStep >= steps.length - 1 ? t('pattern.finished') : t('pattern.nextStep')}
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <StepCounter />
    </motion.div>
  );
}
