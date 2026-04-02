import { useState, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import type { TranslationKey } from '@/i18n/translations';

interface FiberRow {
  id: string;
  percentage: string;
  material: string;
}

const FIBER_PRESETS: { value: string; labelKey: TranslationKey }[] = [
  { value: 'Merino', labelKey: 'fiber.merino' },
  { value: 'Alpaca', labelKey: 'fiber.alpaca' },
  { value: 'Cashmere', labelKey: 'fiber.cashmere' },
  { value: 'Cotton', labelKey: 'fiber.cotton' },
  { value: 'Silk', labelKey: 'fiber.silk' },
  { value: 'Linen', labelKey: 'fiber.linen' },
  { value: 'Mohair', labelKey: 'fiber.mohair' },
  { value: 'Nylon', labelKey: 'fiber.nylon' },
  { value: 'Acrylic', labelKey: 'fiber.acrylic' },
  { value: 'Bamboo', labelKey: 'fiber.bamboo' },
  { value: 'Wool', labelKey: 'fiber.wool' },
  { value: 'Polyester', labelKey: 'fiber.polyester' },
];

function parseFiberContent(value: string): FiberRow[] {
  if (!value.trim()) return [{ id: crypto.randomUUID(), percentage: '', material: '' }];
  const parts = value.split(',').map(s => s.trim()).filter(Boolean);
  const rows = parts.map(part => {
    const match = part.match(/^(\d+)%?\s*(.+)$/);
    if (match) {
      return { id: crypto.randomUUID(), percentage: match[1], material: match[2].trim() };
    }
    return { id: crypto.randomUUID(), percentage: '', material: part };
  });
  return rows.length > 0 ? rows : [{ id: crypto.randomUUID(), percentage: '', material: '' }];
}

function assembleFiberContent(rows: FiberRow[]): string {
  return rows
    .filter(r => r.material)
    .map(r => r.percentage ? `${r.percentage}% ${r.material}` : r.material)
    .join(', ');
}

interface FiberContentSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function FiberContentSelector({ value, onChange }: FiberContentSelectorProps) {
  const { t } = useI18n();
  const [rows, setRows] = useState<FiberRow[]>(() => parseFiberContent(value));

  useEffect(() => {
    const assembled = assembleFiberContent(rows);
    if (assembled !== value) {
      onChange(assembled);
    }
  }, [rows]);

  // Sync from external value changes
  useEffect(() => {
    const currentAssembled = assembleFiberContent(rows);
    if (value !== currentAssembled) {
      setRows(parseFiberContent(value));
    }
  }, [value]);

  const updateRow = (id: string, field: 'percentage' | 'material', val: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  };

  const addRow = () => {
    setRows(prev => [...prev, { id: crypto.randomUUID(), percentage: '', material: '' }]);
  };

  const removeRow = (id: string) => {
    setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  };

  const datalistId = 'fiber-presets';

  return (
    <div className="space-y-2">
      <datalist id={datalistId}>
        {FIBER_PRESETS.map((f) => (
          <option key={f.value} value={f.value}>{t(f.labelKey)}</option>
        ))}
      </datalist>
      {rows.map((row, index) => (
        <div key={row.id} className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={row.percentage}
            onChange={(e) => updateRow(row.id, 'percentage', e.target.value)}
            placeholder="%"
            className="w-16 h-9 text-sm"
          />
          <Input
            list={datalistId}
            value={row.material}
            onChange={(e) => updateRow(row.id, 'material', e.target.value)}
            placeholder={t('fiber.selectMaterial')}
            className="flex-1 h-9 text-sm"
          />
          {/* Show add button inline after first row only */}
          {index === 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary" onClick={addRow}>
              <Plus className="w-3 h-3" />
            </Button>
          )}
          {rows.length > 1 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeRow(row.id)}>
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
