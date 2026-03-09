import { useI18n } from '@/i18n/useI18n';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === 'zh' ? 'en' : 'zh')}
      className="rounded-xl h-8 px-2 gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{locale === 'zh' ? 'EN' : '中文'}</span>
    </Button>
  );
}
