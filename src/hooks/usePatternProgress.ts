import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface PatternProgress {
  id: string;
  pattern_id: string;
  current_step: number;
  total_steps: number;
  step_timestamps: number[];
  corrections: Record<number, string>;
}

export function usePatternProgress(patternId: string | null) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<PatternProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState<number | null>(null);
  const lastStepTime = useRef<number>(Date.now());

  const fetchProgress = useCallback(async () => {
    if (!user || !patternId) { setLoading(false); return; }
    const { data } = await supabase
      .from('pattern_progress')
      .select('*')
      .eq('pattern_id', patternId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setProgress(data as unknown as PatternProgress);
    }
    setLoading(false);
  }, [user, patternId]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const initProgress = async (totalSteps: number) => {
    if (!user || !patternId) return;
    const { data } = await supabase
      .from('pattern_progress')
      .upsert({
        pattern_id: patternId, user_id: user.id,
        current_step: 0, total_steps: totalSteps,
        step_timestamps: [], corrections: {},
      } as any, { onConflict: 'pattern_id,user_id' })
      .select()
      .single();
    if (data) setProgress(data as unknown as PatternProgress);
  };

  const advanceStep = async () => {
    if (!progress || !user) return;
    const now = Date.now();
    const newTimestamps = [...(progress.step_timestamps || []), now];
    const newStep = Math.min(progress.current_step + 1, progress.total_steps);

    // Estimate time
    if (newTimestamps.length >= 2) {
      const intervals = newTimestamps.slice(1).map((t, i) => t - newTimestamps[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const remaining = progress.total_steps - newStep;
      setEstimatedTimeLeft(Math.round((avg * remaining) / 1000));
    }

    lastStepTime.current = now;
    const updated = { ...progress, current_step: newStep, step_timestamps: newTimestamps };
    setProgress(updated);

    await supabase.from('pattern_progress').update({
      current_step: newStep, step_timestamps: newTimestamps,
    } as any).eq('id', progress.id);
  };

  const goBack = async () => {
    if (!progress || progress.current_step <= 0) return;
    const newStep = progress.current_step - 1;
    setProgress({ ...progress, current_step: newStep });
    await supabase.from('pattern_progress').update({ current_step: newStep } as any).eq('id', progress.id);
  };

  const addCorrection = async (stepIndex: number, correctedText: string) => {
    if (!progress) return;
    const newCorrections = { ...progress.corrections, [stepIndex]: correctedText };
    setProgress({ ...progress, corrections: newCorrections });
    await supabase.from('pattern_progress').update({ corrections: newCorrections } as any).eq('id', progress.id);
  };

  const percentage = progress ? Math.round((progress.current_step / Math.max(progress.total_steps, 1)) * 100) : 0;

  return {
    progress, loading, percentage, estimatedTimeLeft,
    initProgress, advanceStep, goBack, addCorrection, refetch: fetchProgress,
  };
}
