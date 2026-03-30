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
      className="fixed right-4 top-1/2 -translate-y-1/2 z-40 glass-card p-4 space-y-3 w-20 shadow-lg"
    >
      <p className="text-xs text-muted-foreground text-center font-medium">{t('pattern.counter')}</p>
      <Button variant="ghost" size="icon" className="w-full h-12 rounded-xl" onClick={() => setCount(c => c + 1)}>
        <Plus className="w-5 h-5" />
      </Button>
      <div className="text-center text-3xl font-mono font-bold text-primary">{count}</div>
      <Button variant="ghost" size="icon" className="w-full h-12 rounded-xl" onClick={() => setCount(c => Math.max(0, c - 1))}>
        <Minus className="w-5 h-5" />
      </Button>
      <Button variant="ghost" size="icon" className="w-full h-9 rounded-xl" onClick={() => setCount(0)}>
        <RotateCcw className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
