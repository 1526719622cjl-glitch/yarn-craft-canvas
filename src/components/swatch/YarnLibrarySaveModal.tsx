import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface YarnLibrarySaveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
}

export function YarnLibrarySaveModal({ open, onOpenChange, onSave }: YarnLibrarySaveModalProps) {
  const [yarnName, setYarnName] = useState('');

  const handleSave = () => {
    if (yarnName.trim()) {
      onSave(yarnName.trim());
      setYarnName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-none max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="w-5 h-5 text-primary" />
            Save to My Yarn Library
          </DialogTitle>
          <DialogDescription>
            Save current swatch data and yarn specifications for future projects.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="yarn-name" className="text-sm font-medium">
              Yarn Name
            </Label>
            <Input
              id="yarn-name"
              value={yarnName}
              onChange={(e) => setYarnName(e.target.value)}
              placeholder="e.g., Merino DK - Natural White"
              className="input-glass"
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!yarnName.trim()}
            className="rounded-xl soft-press"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Yarn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
