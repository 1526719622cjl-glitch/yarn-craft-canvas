import { motion } from 'framer-motion';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Ruler, Grid3X3, Sparkles, Package, LogOut, LogIn, User } from 'lucide-react';
import { CrochetHookIcon, KnittingNeedlesIcon } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', icon: Ruler, label: 'Swatch Lab', description: 'Gauge Calculator' },
  { path: '/pixel', icon: Grid3X3, label: 'Pixel Generator', description: 'Image to Grid' },
  { path: '/crochet', icon: CrochetHookIcon, label: 'Crochet Engine', description: 'Pattern Parser' },
  { path: '/knitting', icon: KnittingNeedlesIcon, label: 'Knitting Engine', description: 'Chart Designer' },
  { path: '/vault', icon: Package, label: 'Yarn Vault', description: 'My Library' },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, loading } = useAuth();

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed left-0 top-0 h-screen w-72 glass-card rounded-none border-r border-border/30 z-50"
    >
      {/* Logo */}
      <div className="p-6 border-b border-border/30">
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
            <p className="text-xs text-muted-foreground">线·索 · All for Yarn</p>
          </div>
        </motion.div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2">
        {navItems.map((item, index) => {
          const isActive = location.pathname === item.path;
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
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
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
                Sign Out
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
              Sign In
            </Button>
          )
        )}
        <div className="text-center pt-2">
          <p className="text-xs text-muted-foreground">
            Design Suite: All for Yarn
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
