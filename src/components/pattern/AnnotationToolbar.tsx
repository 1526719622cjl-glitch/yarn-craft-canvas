import { Pencil, Highlighter, StickyNote, Eraser, Save, Type, Undo, Redo, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type AnnotationTool = 'none' | 'pen' | 'highlight' | 'note' | 'text' | 'eraser';

const PRESET_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#000000'];

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  onClearAll: () => void;
  onSave: () => void;
  saving?: boolean;
  color: string;
  onColorChange: (color: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function AnnotationToolbar({
  activeTool, onToolChange, onClearAll, onSave, saving = false,
  color, onColorChange, onUndo, onRedo, canUndo, canRedo,
}: AnnotationToolbarProps) {
  return (
    <div className="absolute top-3 left-3 z-20 flex items-center gap-1 rounded-xl bg-background/90 border border-border/50 p-1 flex-wrap">
      <Tooltip><TooltipTrigger asChild>
        <Button variant={activeTool === 'pen' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange(activeTool === 'pen' ? 'none' : 'pen')}>
          <Pencil className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>画笔</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant={activeTool === 'highlight' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange(activeTool === 'highlight' ? 'none' : 'highlight')}>
          <Highlighter className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>荧光笔</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant={activeTool === 'note' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange(activeTool === 'note' ? 'none' : 'note')}>
          <StickyNote className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>便签</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant={activeTool === 'text' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange(activeTool === 'text' ? 'none' : 'text')}>
          <Type className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>文字</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant={activeTool === 'eraser' ? 'secondary' : 'ghost'} size="icon" onClick={() => onToolChange(activeTool === 'eraser' ? 'none' : 'eraser')}>
          <Eraser className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>橡皮擦（点击删除）</TooltipContent></Tooltip>

      <div className="w-px h-6 bg-border/50 mx-0.5" />

      {/* Color picker */}
      <div className="flex items-center gap-0.5 px-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            className="w-5 h-5 rounded-full border-2 transition-transform"
            style={{
              backgroundColor: c,
              borderColor: color === c ? 'hsl(var(--primary))' : 'transparent',
              transform: color === c ? 'scale(1.2)' : 'scale(1)',
            }}
            onClick={() => onColorChange(c)}
          />
        ))}
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-5 h-5 rounded-full cursor-pointer border-0 p-0"
          style={{ appearance: 'none', WebkitAppearance: 'none' }}
        />
      </div>

      <div className="w-px h-6 bg-border/50 mx-0.5" />

      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo}>
          <Undo className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>撤销</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onRedo} disabled={!canRedo}>
          <Redo className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>重做</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onClearAll}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </TooltipTrigger><TooltipContent>清空全部标注</TooltipContent></Tooltip>

      <Tooltip><TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={onSave} disabled={saving}>
          <Save className="w-4 h-4" />
        </Button>
      </TooltipTrigger><TooltipContent>保存标注</TooltipContent></Tooltip>
    </div>
  );
}
