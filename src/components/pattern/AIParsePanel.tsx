import { useState } from 'react';
import { Brain, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useI18n } from '@/i18n/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface ParsedStep {
  row: number;
  instruction: string;
  anchorRegion?: { x: number; y: number; width: number; height: number };
  colors?: { color: string; count: number }[];
}

interface AIParsePanelProps {
  imageUrl: string;
  category: 'crochet' | 'knitting';
  patternId: string;
  onStepsLoaded: (steps: ParsedStep[]) => void;
  steps: ParsedStep[];
  currentStep: number;
  onStepClick: (index: number) => void;
}

export function AIParsePanel({ imageUrl, category, patternId, onStepsLoaded, steps, currentStep, onStepClick }: AIParsePanelProps) {
  const { t } = useI18n();
  const [parsing, setParsing] = useState(false);

  const handleParse = async () => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-chart-image', {
        body: { imageUrl, category },
      });
      if (error) throw error;
      const parsedSteps: ParsedStep[] = data?.steps || [];
      onStepsLoaded(parsedSteps);

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('pattern_ai_parses').insert({
          pattern_id: patternId, user_id: user.id,
          parsed_steps: parsedSteps, anchor_regions: parsedSteps.map(s => s.anchorRegion || null),
        } as any);
      }
      toast({ title: t('pattern.parseSuccess') });
    } catch (e: any) {
      console.error('AI parse error:', e);
      toast({ title: t('pattern.parseError'), description: e.message, variant: 'destructive' });
    }
    setParsing(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-medium text-sm">{t('pattern.aiParse')}</h3>
        </div>
        <Button size="sm" onClick={handleParse} disabled={parsing}>
          {parsing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Brain className="w-4 h-4 mr-1" />}
          {t('pattern.startParse')}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {steps.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t('pattern.parseHint')}</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {steps.map((step, i) => (
              <button
                key={i}
                onClick={() => onStepClick(i)}
                className={`w-full text-left p-3 rounded-xl transition-all text-sm ${
                  currentStep === i
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-8">R{step.row}</span>
                  <span className="flex-1">{step.instruction}</span>
                  <ChevronRight className={`w-3 h-3 transition-transform ${currentStep === i ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
