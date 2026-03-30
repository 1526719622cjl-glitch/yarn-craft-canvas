import { createContext, useContext, useCallback, type ReactNode } from 'react';
import { type TranslationKey, getTranslation } from './translations';

interface I18nContextType {
  locale: 'zh';
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = useCallback((key: TranslationKey) => {
    return getTranslation(key);
  }, []);

  return (
    <I18nContext.Provider value={{ locale: 'zh', t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
