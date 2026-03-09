import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';

export function StepCounter() {
  const { t } = useI18n();
  const [count, setCount] = useState(0);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 glass-card p-3 space-y-2 w-16"
    >
      <p className="text-[10px] text-muted-foreground text-center">{t('pattern.counter')}</p>
      <Button variant="ghost" size="icon" className="w-full h-10" onClick={() => setCount(c => c + 1)}>
        <Plus className="w-4 h-4" />
      </Button>
      <div className="text-center text-2xl font-mono font-bold">{count}</div>
      <Button variant="ghost" size="icon" className="w-full h-10" onClick={() => setCount(c => Math.max(0, c - 1))}>
        <Minus className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="icon" className="w-full h-8" onClick={() => setCount(0)}>
        <RotateCcw className="w-3 h-3" />
      </Button>
    </motion.div>
  );
}
