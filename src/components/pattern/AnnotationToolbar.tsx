import { Pencil, Highlighter, StickyNote, Eraser, Save, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AnnotationTool = 'none' | 'pen' | 'highlight' | 'note' | 'text';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onClear: () => void;
  onSave: () => void;
  saving?: boolean;
}

export function AnnotationToolbar({ activeTool, onToolChange, onClear, onSave, saving = false }: AnnotationToolbarProps) {
  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-xl bg-background/90 border border-border/50 p-1">
      <Button variant={activeTool === 'pen' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange('pen')}>
        <Pencil className="w-4 h-4" />
      </Button>
      <Button variant={activeTool === 'highlight' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange('highlight')}>
        <Highlighter className="w-4 h-4" />
      </Button>
      <Button variant={activeTool === 'note' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange('note')}>
        <StickyNote className="w-4 h-4" />
      </Button>
      <Button variant={activeTool === 'text' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange('text')}>
        <Type className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onClear}>
        <Eraser className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" onClick={onSave} disabled={saving}>
        <Save className="w-4 h-4" />
      </Button>
    </div>
  );
}
