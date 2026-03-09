import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Link2, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/useI18n';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface GaugeData {
  stitchesPer10cm: number;
  rowsPer10cm: number;
  yarnEntryId?: string;
  yarnName?: string;
}

interface GaugeInputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (gauge: GaugeData) => void;
  initialGauge?: GaugeData | null;
}

interface YarnEntry {
  id: string;
  name: string;
  brand: string | null;
  stitches_per_10cm: number | null;
  rows_per_10cm: number | null;
}

export function GaugeInputDialog({ open, onOpenChange, onConfirm, initialGauge }: GaugeInputDialogProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [mode, setMode] = useState<'link' | 'manual'>('link');
  const [yarnEntries, setYarnEntries] = useState<YarnEntry[]>([]);
  const [selectedYarn, setSelectedYarn] = useState<string>('');
  const [manualStitches, setManualStitches] = useState(initialGauge?.stitchesPer10cm?.toString() || '20');
  const [manualRows, setManualRows] = useState(initialGauge?.rowsPer10cm?.toString() || '26');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      loadYarnEntries();
    }
  }, [open, user]);

  const loadYarnEntries = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('yarn_entries')
      .select('id, name, brand, stitches_per_10cm, rows_per_10cm')
      .eq('user_id', user!.id)
      .not('stitches_per_10cm', 'is', null)
      .not('rows_per_10cm', 'is', null);
    if (data) {
      setYarnEntries(data as YarnEntry[]);
      if (initialGauge?.yarnEntryId) {
        setSelectedYarn(initialGauge.yarnEntryId);
      }
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (mode === 'link' && selectedYarn) {
      const yarn = yarnEntries.find(y => y.id === selectedYarn);
      if (yarn && yarn.stitches_per_10cm && yarn.rows_per_10cm) {
        onConfirm({
          stitchesPer10cm: yarn.stitches_per_10cm,
          rowsPer10cm: yarn.rows_per_10cm,
          yarnEntryId: yarn.id,
          yarnName: yarn.brand ? `${yarn.brand} ${yarn.name}` : yarn.name,
        });
      }
    } else {
      const stitches = parseFloat(manualStitches) || 20;
      const rows = parseFloat(manualRows) || 26;
      onConfirm({
        stitchesPer10cm: stitches,
        rowsPer10cm: rows,
      });
    }
  };

  const selectedYarnData = yarnEntries.find(y => y.id === selectedYarn);
  const canConfirm = mode === 'manual' || (mode === 'link' && selectedYarn);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            {t('pattern.gaugeSetup')}
          </DialogTitle>
          <DialogDescription>
            {t('pattern.gaugeDescription')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'link' | 'manual')} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link" className="gap-2">
              <Link2 className="w-4 h-4" />
              {t('pattern.linkYarn')}
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <Pencil className="w-4 h-4" />
              {t('pattern.manualInput')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="link" className="mt-4 space-y-4">
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                {t('common.loading')}
              </div>
            ) : yarnEntries.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                <p>{t('pattern.noYarnWithGauge')}</p>
                <p className="text-xs mt-2">{t('pattern.addGaugeHint')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t('pattern.selectYarn')}</Label>
                  <Select value={selectedYarn} onValueChange={setSelectedYarn}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('pattern.chooseYarn')} />
                    </SelectTrigger>
                    <SelectContent>
                      {yarnEntries.map((yarn) => (
                        <SelectItem key={yarn.id} value={yarn.id}>
                          {yarn.brand ? `${yarn.brand} - ${yarn.name}` : yarn.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedYarnData && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-primary/5 border border-primary/20"
                  >
                    <p className="text-sm font-medium mb-2">{t('pattern.linkedGauge')}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('yarn.stitchesPer10cm')}</span>
                        <p className="font-mono text-lg">{selectedYarnData.stitches_per_10cm}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('yarn.rowsPer10cm')}</span>
                        <p className="font-mono text-lg">{selectedYarnData.rows_per_10cm}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="manual" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stitches">{t('yarn.stitchesPer10cm')}</Label>
                <Input
                  id="stitches"
                  type="number"
                  value={manualStitches}
                  onChange={(e) => setManualStitches(e.target.value)}
                  min={1}
                  step={0.5}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rows">{t('yarn.rowsPer10cm')}</Label>
                <Input
                  id="rows"
                  type="number"
                  value={manualRows}
                  onChange={(e) => setManualRows(e.target.value)}
                  min={1}
                  step={0.5}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 mt-6">
          <Button variant="ghost" className="flex-shrink-0" onClick={() => onOpenChange(false)}>
            {t('pattern.skipGauge')}
          </Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={!canConfirm}>
            <Check className="w-4 h-4 mr-1" />
            {t('pattern.startWithGauge')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
