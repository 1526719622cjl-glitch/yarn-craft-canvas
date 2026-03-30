import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Image as ImageIcon, FileText, Maximize, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PatternViewer, type PatternAnnotationData } from '@/components/pattern/PatternViewer';
import { StepCounter } from '@/components/pattern/StepCounter';
import type { PatternEntry, PatternFile } from '@/hooks/usePatternLibrary';
import { toast } from '@/hooks/use-toast';

const EMPTY_ANNOTATION: PatternAnnotationData = { strokes: [], highlights: [], notes: [] };

export default function PatternDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const [pattern, setPattern] = useState<PatternEntry | null>(null);
  const [files, setFiles] = useState<PatternFile[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [annotationData, setAnnotationData] = useState<PatternAnnotationData>(EMPTY_ANNOTATION);
  const [annotationRowId, setAnnotationRowId] = useState<string | null>(null);
  const [savingAnnotation, setSavingAnnotation] = useState(false);
  const [finishedPhoto, setFinishedPhoto] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const finishedPhotoRef = useRef<HTMLInputElement>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);

  const fetchPatternData = useCallback(async () => {
    if (!id || !user) return;
    const { data: p } = await supabase.from('pattern_library').select('*').eq('id', id).single();
    if (p) {
      const patternData = p as unknown as PatternEntry;
      setPattern(patternData);
      setFinishedPhoto((p as any).finished_photo_url || null);
    }
    const { data: f } = await supabase.from('pattern_files').select('*').eq('pattern_id', id).order('sort_order');
    if (f) setFiles(f as unknown as PatternFile[]);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    if (!id || !user) return;
    setLoading(true);
    fetchPatternData();
  }, [id, user, fetchPatternData]);

  // Poll for files if none found yet
  useEffect(() => {
    if (!id || !user || loading || files.length > 0) return;
    let attempts = 0;
    const maxAttempts = 6;
    const interval = setInterval(async () => {
      attempts++;
      const { data: f } = await supabase.from('pattern_files').select('*').eq('pattern_id', id).order('sort_order');
      if (f && f.length > 0) {
        setFiles(f as unknown as PatternFile[]);
        clearInterval(interval);
      }
      if (attempts >= maxAttempts) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }, [id, user, loading, files.length]);

  const currentFile = files[selectedFileIndex];
  const currentFileUrl = currentFile?.file_url;
  const isImageFile = !!currentFileUrl && (currentFile?.file_type === 'image' || /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(currentFileUrl));

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
    const payload = { pattern_file_id: currentFile.id, user_id: user.id, annotation_type: 'canvas', data: annotationData };
    if (annotationRowId) {
      await supabase.from('pattern_annotations').update(payload as any).eq('id', annotationRowId);
    } else {
      const { data } = await supabase.from('pattern_annotations').insert(payload as any).select('id').single();
      if (data?.id) setAnnotationRowId(data.id as string);
    }
    setSavingAnnotation(false);
    toast({ title: t('pattern.annotationSaved') });
  };

  const handleFullscreen = () => {
    pdfContainerRef.current?.requestFullscreen?.();
  };

  const handleUploadFinishedPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !id) return;
    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${id}/finished_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('pattern-files').upload(path, file);
    if (error) {
      toast({ title: 'Upload error', description: error.message, variant: 'destructive' });
      setUploadingPhoto(false);
      return;
    }
    const { data: urlData } = supabase.storage.from('pattern-files').getPublicUrl(path);
    const url = urlData.publicUrl;
    await supabase.from('pattern_library').update({ finished_photo_url: url } as any).eq('id', id);
    setFinishedPhoto(url);
    setUploadingPhoto(false);
    toast({ title: t('pattern.finishedPhoto') });
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
          <div className="flex items-center gap-2">
            <input ref={finishedPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleUploadFinishedPhoto} />
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => finishedPhotoRef.current?.click()} disabled={uploadingPhoto}>
              <Upload className="w-4 h-4 mr-1" />
              {t('pattern.uploadFinishedPhoto')}
            </Button>
          </div>
        </div>

        {/* Finished photo display */}
        {finishedPhoto && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">{t('pattern.finishedPhoto')}</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={async () => {
                await supabase.from('pattern_library').update({ finished_photo_url: null } as any).eq('id', id);
                setFinishedPhoto(null);
              }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            <img src={finishedPhoto} alt="Finished" className="max-h-64 rounded-xl object-contain" />
          </div>
        )}

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
          <div className="relative">
            {isImageFile ? (
              <PatternViewer
                imageUrl={currentFileUrl}
                annotations={annotationData}
                onAnnotationChange={setAnnotationData}
                onSaveAnnotation={saveAnnotations}
                savingAnnotation={savingAnnotation}
              />
            ) : (
              <div
                ref={pdfContainerRef}
                className="w-full bg-muted/20 rounded-2xl overflow-hidden border border-border/50"
                style={{ resize: 'vertical', overflow: 'auto', minHeight: '400px', height: '80vh' }}
              >
                <div className="p-3 border-b border-border/50 flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('pattern.pdfPreview')}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleFullscreen}>
                    <Maximize className="w-4 h-4 mr-1" />
                    {t('pattern.fullscreen')}
                  </Button>
                </div>
                <iframe src={currentFileUrl} className="w-full h-[calc(100%-44px)]" title="pattern-pdf" loading="lazy" />
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <p className="text-4xl mb-4">📄</p>
            <p className="text-muted-foreground">{t('pattern.noFiles')}</p>
          </div>
        )}
      </motion.div>

      {/* Counter widget */}
      <StepCounter />
    </>
  );
}
