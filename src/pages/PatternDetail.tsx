import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { usePatternProgress } from '@/hooks/usePatternProgress';
import { supabase } from '@/integrations/supabase/client';
import { PatternViewer } from '@/components/pattern/PatternViewer';
import { AIParsePanel, type ParsedStep } from '@/components/pattern/AIParsePanel';
import { ImmersiveCompanion } from '@/components/pattern/ImmersiveCompanion';
import { StepCounter } from '@/components/pattern/StepCounter';
import { GaugeInputDialog, type GaugeData } from '@/components/pattern/GaugeInputDialog';
import type { RowPixelData } from '@/components/pattern/PixelRowPreview';
import type { PatternEntry, PatternFile } from '@/hooks/usePatternLibrary';

export default function PatternDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const [pattern, setPattern] = useState<PatternEntry | null>(null);
  const [files, setFiles] = useState<PatternFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [steps, setSteps] = useState<ParsedStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGaugeDialog, setShowGaugeDialog] = useState(false);
  const [gauge, setGauge] = useState<GaugeData | null>(null);
  const [pixelRows, setPixelRows] = useState<RowPixelData[]>([]);

  const { progress, percentage, estimatedTimeLeft, initProgress, advanceStep, goBack, addCorrection } = usePatternProgress(id || null);

  // Fetch pattern + files
  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const { data: p } = await supabase.from('pattern_library').select('*').eq('id', id).single();
      if (p) setPattern(p as unknown as PatternEntry);

      const { data: f } = await supabase.from('pattern_files').select('*').eq('pattern_id', id).order('sort_order');
      if (f) setFiles(f as unknown as PatternFile[]);

      // Load existing AI parse
      const { data: parses } = await supabase.from('pattern_ai_parses').select('*').eq('pattern_id', id).order('created_at', { ascending: false }).limit(1);
      if (parses && parses.length > 0) {
        setSteps((parses[0] as any).parsed_steps || []);
      }

      setLoading(false);
    })();
  }, [id, user]);

  const currentFile = files[selectedFileIndex];
  const currentImageUrl = currentFile?.file_url;

  const handleStepsLoaded = (newSteps: ParsedStep[]) => {
    setSteps(newSteps);
    initProgress(newSteps.length);
  };

  const handleStartCompanion = () => {
    if (steps.length === 0) return;
    setShowGaugeDialog(true);
  };

  const handleGaugeConfirm = (gaugeData: GaugeData) => {
    setGauge(gaugeData);
    setShowGaugeDialog(false);
    if (!progress) initProgress(steps.length);
    setImmersiveMode(true);
  };

  const handleSkipGauge = () => {
    setShowGaugeDialog(false);
    if (!progress) initProgress(steps.length);
    setImmersiveMode(true);
  };

  const category = pattern?.category || 'crochet';

  if (loading) {
    return <div className="max-w-6xl mx-auto p-8 text-center text-muted-foreground">{t('common.loading')}</div>;
  }

  if (!pattern) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center">
        <p className="text-muted-foreground mb-4">Pattern not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/${category}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-display font-semibold">{pattern.title}</h1>
              {pattern.description && <p className="text-sm text-muted-foreground">{pattern.description}</p>}
            </div>
          </div>
          {steps.length > 0 && (
            <Button onClick={handleStartCompanion} className="rounded-2xl">
              <Play className="w-4 h-4 mr-2" />{t('pattern.startCompanion')}
            </Button>
          )}
        </div>

        {/* File tabs */}
        {files.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {files.map((f, i) => (
              <Button
                key={f.id}
                variant={i === selectedFileIndex ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFileIndex(i)}
              >
                <ImageIcon className="w-3 h-3 mr-1" />
                {i + 1}
              </Button>
            ))}
          </div>
        )}

        {/* Main layout */}
        {currentImageUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '60vh' }}>
            <div className="lg:col-span-2">
              <PatternViewer
                imageUrl={currentImageUrl}
                highlightRegion={steps[currentStepIndex]?.anchorRegion}
              />
            </div>
            <div className="glass-card overflow-hidden flex flex-col">
              <AIParsePanel
                imageUrl={currentImageUrl}
                category={category}
                patternId={id!}
                onStepsLoaded={handleStepsLoaded}
                steps={steps}
                currentStep={currentStepIndex}
                onStepClick={setCurrentStepIndex}
              />
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-muted-foreground">{t('pattern.noFiles')}</p>
          </div>
        )}
      </motion.div>

      {/* Side counter */}
      <StepCounter />

      {/* Gauge Input Dialog */}
      <GaugeInputDialog
        open={showGaugeDialog}
        onOpenChange={(open) => {
          if (!open) handleSkipGauge();
        }}
        onConfirm={handleGaugeConfirm}
        initialGauge={gauge}
      />

      {/* Immersive mode */}
      {immersiveMode && currentImageUrl && (
        <ImmersiveCompanion
          steps={steps}
          imageUrl={currentImageUrl}
          progress={progress}
          percentage={percentage}
          estimatedTimeLeft={estimatedTimeLeft}
          onAdvance={advanceStep}
          onGoBack={goBack}
          onCorrection={addCorrection}
          onClose={() => setImmersiveMode(false)}
          gauge={gauge}
          pixelRows={pixelRows}
        />
      )}
    </>
  );
}
