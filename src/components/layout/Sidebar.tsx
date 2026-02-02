import { motion } from 'framer-motion';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Ruler, 
  Grid3X3, 
  Circle, 
  LayoutGrid,
  Sparkles 
} from 'lucide-react';

const navItems = [
  { path: '/', icon: Ruler, label: 'Swatch Lab', description: 'Gauge Calculator' },
  { path: '/pixel', icon: Grid3X3, label: 'Pixel Generator', description: 'Image to Grid' },
  { path: '/crochet', icon: Circle, label: 'Crochet Engine', description: 'Pattern Parser' },
  { path: '/knitting', icon: LayoutGrid, label: 'Knitting Engine', description: 'Chart Designer' },
];

export function Sidebar() {
  const location = useLocation();

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
            <p className="text-xs text-muted-foreground">线索 · Design Suite</p>
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

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border/30">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Crafted with care for yarn artists
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
