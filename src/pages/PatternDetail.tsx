import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, Image as ImageIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { usePatternProgress } from '@/hooks/usePatternProgress';
import { supabase } from '@/integrations/supabase/client';
import { PatternViewer, type PatternAnnotationData } from '@/components/pattern/PatternViewer';
import { AIParsePanel, type ParsedStep } from '@/components/pattern/AIParsePanel';
import { ImmersiveCompanion } from '@/components/pattern/ImmersiveCompanion';
import { GaugeInputDialog, type GaugeData } from '@/components/pattern/GaugeInputDialog';
import type { RowPixelData } from '@/components/pattern/PixelRowPreview';
import type { PatternEntry, PatternFile } from '@/hooks/usePatternLibrary';
import { toast } from '@/hooks/use-toast';

const EMPTY_ANNOTATION: PatternAnnotationData = { strokes: [], highlights: [], notes: [] };
const IMAGE_EXT_REGEX = /\.(png|jpe?g|webp|gif)(\?.*)?$/i;

const buildPixelRows = (steps: ParsedStep[]): RowPixelData[] =>
  steps
    .filter((s) => s.colors && s.colors.length > 0)
    .map((s) => ({
      row: s.row,
      pixels: s.colors!.map((c) => ({ color: c.color, count: c.count })),
      totalStitches: s.colors!.reduce((sum, c) => sum + c.count, 0),
    }));

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
  const [annotationData, setAnnotationData] = useState<PatternAnnotationData>(EMPTY_ANNOTATION);
  const [annotationRowId, setAnnotationRowId] = useState<string | null>(null);
  const [savingAnnotation, setSavingAnnotation] = useState(false);

  const { progress, percentage, estimatedTimeLeft, initProgress, advanceStep, goBack, addCorrection } = usePatternProgress(id || null);

  useEffect(() => {
    if (!id || !user) return;

    (async () => {
      setLoading(true);

      const { data: p } = await supabase.from('pattern_library').select('*').eq('id', id).single();
      if (p) {
        const patternData = p as unknown as PatternEntry;
        setPattern(patternData);

        if ((patternData as any).linked_yarn_id) {
          const { data: yarn } = await supabase
            .from('yarn_entries')
            .select('id, name, brand, stitches_per_10cm, rows_per_10cm')
            .eq('id', (patternData as any).linked_yarn_id)
            .maybeSingle();

          if (yarn?.stitches_per_10cm && yarn?.rows_per_10cm) {
            setGauge({
              stitchesPer10cm: Number(yarn.stitches_per_10cm),
              rowsPer10cm: Number(yarn.rows_per_10cm),
              yarnEntryId: yarn.id,
              yarnName: yarn.brand ? `${yarn.brand} ${yarn.name}` : yarn.name,
            });
          }
        }
      }

      const { data: f } = await supabase.from('pattern_files').select('*').eq('pattern_id', id).order('sort_order');
      if (f) setFiles(f as unknown as PatternFile[]);

      const { data: parses } = await supabase
        .from('pattern_ai_parses')
        .select('*')
        .eq('pattern_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (parses && parses.length > 0) {
        const parsedSteps = ((parses[0] as any).parsed_steps || []) as ParsedStep[];
        setSteps(parsedSteps);
        setPixelRows(buildPixelRows(parsedSteps));
      }

      setLoading(false);
    })();
  }, [id, user]);

  const currentFile = files[selectedFileIndex];
  const currentFileUrl = currentFile?.file_url;
  const isImageFile = !!currentFileUrl && (currentFile?.file_type === 'image' || IMAGE_EXT_REGEX.test(currentFileUrl));

  useEffect(() => {
    if (!currentFile?.id || !user) {
      setAnnotationData(EMPTY_ANNOTATION);
      setAnnotationRowId(null);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from('pattern_annotations')
        .select('id, data')
        .eq('pattern_file_id', currentFile.id)
        .eq('user_id', user.id)
        .eq('annotation_type', 'canvas')
        .order('created_at', { ascending: false })
        .limit(1);

      const row = data?.[0] as any;
      setAnnotationRowId(row?.id ?? null);
      setAnnotationData((row?.data as PatternAnnotationData) || EMPTY_ANNOTATION);
    })();
  }, [currentFile?.id, user]);

  const saveAnnotations = async () => {
    if (!user || !currentFile?.id) return;
    setSavingAnnotation(true);

    const payload = {
      pattern_file_id: currentFile.id,
      user_id: user.id,
      annotation_type: 'canvas',
      data: annotationData,
    };

    if (annotationRowId) {
      await supabase.from('pattern_annotations').update(payload as any).eq('id', annotationRowId);
    } else {
      const { data } = await supabase.from('pattern_annotations').insert(payload as any).select('id').single();
      if (data?.id) setAnnotationRowId(data.id as string);
    }

    setSavingAnnotation(false);
    toast({ title: t('pattern.annotationSaved') });
  };

  const handleStepsLoaded = (newSteps: ParsedStep[]) => {
    setSteps(newSteps);
    setCurrentStepIndex(0);
    initProgress(newSteps.length);
    setPixelRows(buildPixelRows(newSteps));
  };

  const handleStartCompanion = () => {
    if (steps.length === 0) {
      toast({ title: t('pattern.parseFirst'), variant: 'destructive' });
      return;
    }
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
        <p className="text-muted-foreground mb-4">{t('pattern.notFound')}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />{t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/${category}`)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl font-display font-semibold truncate">{pattern.title}</h1>
              {pattern.description && <p className="text-sm text-muted-foreground line-clamp-1">{pattern.description}</p>}
            </div>
          </div>

          <Button onClick={handleStartCompanion} className="rounded-2xl" disabled={steps.length === 0}>
            <Play className="w-4 h-4 mr-2" />
            {t('pattern.startCompanion')}
          </Button>
        </div>

        {steps.length === 0 && <p className="text-xs text-muted-foreground">{t('pattern.parseHint')}</p>}

        {files.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {files.map((f, i) => (
              <Button key={f.id} variant={i === selectedFileIndex ? 'default' : 'outline'} size="sm" onClick={() => setSelectedFileIndex(i)}>
                <ImageIcon className="w-3 h-3 mr-1" />
                {i + 1}
              </Button>
            ))}
          </div>
        )}

        {currentFileUrl ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: '60vh' }}>
            <div className="lg:col-span-2">
              {isImageFile ? (
                <PatternViewer
                  imageUrl={currentFileUrl}
                  highlightRegion={steps[currentStepIndex]?.anchorRegion}
                  annotations={annotationData}
                  onAnnotationChange={setAnnotationData}
                  onSaveAnnotation={saveAnnotations}
                  savingAnnotation={savingAnnotation}
                />
              ) : (
                <div className="w-full h-full min-h-[400px] bg-muted/20 rounded-2xl overflow-hidden border border-border/50">
                  <div className="p-3 border-b border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    {t('pattern.pdfPreview')}
                  </div>
                  <iframe src={currentFileUrl} className="w-full h-[70vh]" title="pattern-pdf" loading="lazy" />
                </div>
              )}
            </div>

            <div className="glass-card overflow-hidden flex flex-col">
              <AIParsePanel
                imageUrl={currentFileUrl}
                category={category}
                patternId={id!}
                onStepsLoaded={handleStepsLoaded}
                steps={steps}
                currentStep={currentStepIndex}
                onStepClick={setCurrentStepIndex}
                canParse={isImageFile}
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

      <GaugeInputDialog
        open={showGaugeDialog}
        onOpenChange={(open) => {
          if (!open) handleSkipGauge();
        }}
        onConfirm={handleGaugeConfirm}
        initialGauge={gauge}
      />

      {immersiveMode && currentFileUrl && isImageFile && (
        <ImmersiveCompanion
          steps={steps}
          imageUrl={currentFileUrl}
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
