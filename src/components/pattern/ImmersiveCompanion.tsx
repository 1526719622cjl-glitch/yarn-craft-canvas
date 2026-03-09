import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Edit3, Check, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useI18n } from '@/i18n/useI18n';
import type { ParsedStep } from './AIParsePanel';
import type { PatternProgress } from '@/hooks/usePatternProgress';

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
}

// Simple completion sound using Web Audio API
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
  steps, imageUrl, progress, percentage, estimatedTimeLeft,
  onAdvance, onGoBack, onCorrection, onClose,
}: ImmersiveCompanionProps) {
  const { t } = useI18n();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const currentStep = progress?.current_step || 0;
  const step = steps[currentStep];
  const corrections = progress?.corrections || {};

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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (editing) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); onGoBack(); }
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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-lg flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
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
          <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <span className="text-sm font-mono">{percentage}%</span>
        </div>
      </div>

      {/* Progress */}
      <Progress value={percentage} className="h-1 rounded-none" />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Image region */}
        {step.anchorRegion && (
          <div className="lg:w-1/2 p-4 flex items-center justify-center bg-muted/10">
            <div className="relative max-w-full max-h-full overflow-hidden rounded-2xl">
              <img
                src={imageUrl}
                alt="Pattern region"
                className="max-h-[50vh] lg:max-h-[70vh] object-contain"
                style={{
                  clipPath: step.anchorRegion
                    ? `inset(${step.anchorRegion.y}% ${100 - step.anchorRegion.x - step.anchorRegion.width}% ${100 - step.anchorRegion.y - step.anchorRegion.height}% ${step.anchorRegion.x}%)`
                    : undefined,
                }}
              />
            </div>
          </div>
        )}

        {/* Instruction */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center max-w-lg space-y-6"
            >
              <p className="text-xs text-muted-foreground font-mono">R{step.row}</p>
              {editing ? (
                <div className="space-y-3">
                  <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} className="min-h-[100px] text-lg text-center" />
                  <Button onClick={handleSaveEdit}><Check className="w-4 h-4 mr-1" />{t('common.save')}</Button>
                </div>
              ) : (
                <>
                  <p className="text-2xl lg:text-3xl font-medium leading-relaxed">{displayInstruction}</p>
                  <Button variant="ghost" size="sm" onClick={handleStartEdit}>
                    <Edit3 className="w-3 h-3 mr-1" />{t('pattern.correct')}
                  </Button>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center gap-6 mt-12">
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
    </motion.div>
  );
}
