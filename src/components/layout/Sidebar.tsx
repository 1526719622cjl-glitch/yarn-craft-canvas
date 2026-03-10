import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Ruler, Grid3X3, Sparkles, LogOut, LogIn, User } from 'lucide-react';
import { CrochetHookIcon, KnittingNeedlesIcon } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/useI18n';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { TranslationKey } from '@/i18n/translations';

const navItems: { path: string; icon: any; labelKey: TranslationKey; descKey: TranslationKey }[] = [
  { path: '/', icon: Ruler, labelKey: 'nav.swatchLab', descKey: 'nav.swatchLab.desc' },
  { path: '/pixel', icon: Grid3X3, labelKey: 'nav.pixelGenerator', descKey: 'nav.pixelGenerator.desc' },
  { path: '/crochet', icon: CrochetHookIcon, labelKey: 'nav.crochetEngine', descKey: 'nav.crochetEngine.desc' },
  { path: '/knitting', icon: KnittingNeedlesIcon, labelKey: 'nav.knittingEngine', descKey: 'nav.knittingEngine.desc' },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();
  const { t } = useI18n();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 h-screen w-72 glass-card rounded-none border-r border-border/30 z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border/30">
        <div className="flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-display font-semibold text-foreground">Yarn Clues</h1>
              <p className="text-xs text-muted-foreground">{t('sidebar.subtitle')}</p>
            </div>
          </motion.div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item, index) => {
          const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <NavLink key={item.path} to={item.path}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 + 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`nav-link ${isActive ? 'active' : ''}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                  isActive ? 'bg-primary/20' : 'bg-muted/50'
                }`}>
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{t(item.labelKey)}</span>
                  <span className="text-xs text-muted-foreground">{t(item.descKey)}</span>
                </div>
              </motion.div>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer with Auth */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/30 space-y-3">
        {!loading && (
          user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="w-full justify-start rounded-xl text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('common.signOut')}
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/auth')}
              className="w-full rounded-xl"
            >
              <LogIn className="w-4 h-4 mr-2" />
              {t('common.signIn')}
            </Button>
          )
        )}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            {t('sidebar.footer')}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
