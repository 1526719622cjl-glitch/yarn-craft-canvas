import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/i18n/useI18n';
import { toast } from '@/hooks/use-toast';
import type { PatternEntry } from '@/hooks/usePatternLibrary';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface YarnOption {
  id: string;
  name: string;
  brand: string | null;
  stitches_per_10cm: number | null;
  rows_per_10cm: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'crochet' | 'knitting';
  onCreate: (input: {
    title: string;
    description?: string;
    tags?: string[];
    status?: 'preparing' | 'in_progress' | 'completed';
    linkedYarnId?: string | null;
  }) => Promise<PatternEntry | null>;
  onUploadFile: (patternId: string, file: File) => Promise<string | null>;
  onNavigate?: (patternId: string) => void;
}

export function PatternUploadDialog({ open, onOpenChange, category, onCreate, onUploadFile, onNavigate }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [status, setStatus] = useState<'preparing' | 'in_progress' | 'completed'>('preparing');
  const [selectedYarnId, setSelectedYarnId] = useState<string>('none');
  const [yarnOptions, setYarnOptions] = useState<YarnOption[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data } = await supabase
        .from('yarn_entries')
        .select('id, name, brand, stitches_per_10cm, rows_per_10cm')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      setYarnOptions((data || []) as YarnOption[]);
    })();
  }, [open, user]);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTagInput('');
    setTags([]);
    setStatus('preparing');
    setSelectedYarnId('none');
    setFiles([]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({ title: t('pattern.titleRequired'), variant: 'destructive' });
      return;
    }

    setUploading(true);
    const pattern = await onCreate({
      title,
      description,
      tags,
      status,
      linkedYarnId: selectedYarnId === 'none' ? null : selectedYarnId,
    });

    if (pattern) {
      // Close dialog immediately and navigate
      onOpenChange(false);
      resetForm();
      toast({ title: t('pattern.created') });
      
      // Navigate to the new pattern
      if (onNavigate) {
        onNavigate(pattern.id);
      }

      // Upload files in background (async, don't wait)
      if (files.length > 0) {
        Promise.all(files.map(file => onUploadFile(pattern.id, file))).catch(console.error);
      }
    }

    setUploading(false);
  };

  const selectedYarn = yarnOptions.find((yarn) => yarn.id === selectedYarnId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('pattern.addPattern')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t('pattern.titleLabel')} *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('pattern.titlePlaceholder')} />
          </div>

          <div className="space-y-2">
            <Label>{t('pattern.descriptionLabel')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('pattern.descriptionPlaceholder')}
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('pattern.initialStatus')}</Label>
            <Select value={status} onValueChange={(v: 'preparing' | 'in_progress' | 'completed') => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="preparing">{t('pattern.status.preparing')}</SelectItem>
                <SelectItem value="in_progress">{t('pattern.status.inProgress')}</SelectItem>
                <SelectItem value="completed">{t('pattern.status.completed')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('pattern.linkYarnOptional')}</Label>
            <Select value={selectedYarnId} onValueChange={setSelectedYarnId}>
              <SelectTrigger>
                <SelectValue placeholder={t('pattern.chooseYarnOptional')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('pattern.noLinkedYarn')}</SelectItem>
                {yarnOptions.map((yarn) => (
                  <SelectItem key={yarn.id} value={yarn.id}>
                    {yarn.brand ? `${yarn.brand} - ${yarn.name}` : yarn.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedYarn?.stitches_per_10cm && selectedYarn?.rows_per_10cm && (
              <p className="text-xs text-muted-foreground">
                {t('pattern.linkedGaugePreview')}: {selectedYarn.stitches_per_10cm} / {selectedYarn.rows_per_10cm}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t('pattern.tags')}</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder={t('pattern.tagPlaceholder')}
              />
              <Button variant="outline" size="sm" onClick={addTag}>
                {t('common.apply')}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter((t) => t !== tag))}>
                  {tag} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('pattern.uploadFiles')}</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]);
              }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border/50 rounded-2xl p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t('pattern.dropFiles')}</p>
            </div>
            {files.length > 0 && (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg p-2">
                    <span className="truncate flex-1">
                      <ImageIcon className="w-3 h-3 inline mr-1" />
                      {f.name}
                    </span>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={uploading} className="w-full">
            {uploading ? t('common.loading') : t('pattern.createAndUpload')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
