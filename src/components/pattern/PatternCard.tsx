import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/i18n/useI18n';
import type { PatternEntry } from '@/hooks/usePatternLibrary';

const statusConfig = {
  preparing: { icon: Clock, color: 'bg-yarn-honey/30 text-foreground' },
  in_progress: { icon: Loader2, color: 'bg-yarn-sky/30 text-foreground' },
  completed: { icon: CheckCircle, color: 'bg-yarn-sage/30 text-foreground' },
};

interface PatternCardProps {
  pattern: PatternEntry;
  onClick: () => void;
  onDelete: () => void;
  onStatusChange: (status: 'preparing' | 'in_progress' | 'completed') => void;
}

export function PatternCard({ pattern, onClick, onDelete, onStatusChange }: PatternCardProps) {
  const { t } = useI18n();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const StatusIcon = statusConfig[pattern.status]?.icon || Clock;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="glass-card-hover cursor-pointer group relative"
      onClick={onClick}
    >
      {/* Cover Image */}
      <div className="aspect-[4/3] overflow-hidden rounded-t-3xl bg-muted/30">
        {pattern.cover_image_url ? (
          <img src={pattern.cover_image_url} alt={pattern.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-4xl">
            🧶
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-medium text-sm truncate flex-1">{pattern.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={() => onStatusChange('preparing')}>{t('pattern.status.preparing')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>{t('pattern.status.inProgress')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange('completed')}>{t('pattern.status.completed')}</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="w-3 h-3 mr-2" />{t('common.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {pattern.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{pattern.description}</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className={`text-[10px] ${statusConfig[pattern.status]?.color}`}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {t(`pattern.status.${pattern.status === 'in_progress' ? 'inProgress' : pattern.status}` as any)}
          </Badge>
          {pattern.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
          ))}
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pattern.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pattern.deleteConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
