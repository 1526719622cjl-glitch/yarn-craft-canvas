import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n/useI18n';
import { toast } from '@/hooks/use-toast';
import type { PatternEntry } from '@/hooks/usePatternLibrary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: 'crochet' | 'knitting';
  onCreate: (title: string, description?: string, tags?: string[]) => Promise<PatternEntry | null>;
  onUploadFile: (patternId: string, file: File) => Promise<string | null>;
}

export function PatternUploadDialog({ open, onOpenChange, category, onCreate, onUploadFile }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) { setTags([...tags, tag]); setTagInput(''); }
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast({ title: t('pattern.titleRequired'), variant: 'destructive' }); return; }
    setUploading(true);
    const pattern = await onCreate(title, description, tags);
    if (pattern) {
      for (const file of files) {
        await onUploadFile(pattern.id, file);
      }
      toast({ title: t('pattern.created') });
      onOpenChange(false);
      setTitle(''); setDescription(''); setTags([]); setFiles([]);
    }
    setUploading(false);
  };

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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('pattern.descriptionPlaceholder')} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>{t('pattern.tags')}</Label>
            <div className="flex gap-2">
              <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder={t('pattern.tagPlaceholder')} />
              <Button variant="outline" size="sm" onClick={addTag}>{t('common.apply')}</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => setTags(tags.filter(t => t !== tag))}>
                  {tag} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>
          {/* File upload */}
          <div className="space-y-2">
            <Label>{t('pattern.uploadFiles')}</Label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={(e) => { if (e.target.files) setFiles([...files, ...Array.from(e.target.files)]); }} />
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
                    <span className="truncate flex-1"><ImageIcon className="w-3 h-3 inline mr-1" />{f.name}</span>
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
