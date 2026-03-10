import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

export function Layout({ children }: LayoutProps) {
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-yarn-rose/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full bg-yarn-sage/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full bg-yarn-lavender/15 blur-3xl" />
      </div>

      {isMobile ? (
        <>
          {/* Mobile header */}
          <div className="fixed top-0 left-0 right-0 z-50 h-14 glass-card rounded-none border-b border-border/30 flex items-center px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <span className="ml-3 font-display font-semibold text-foreground">Yarn Clues</span>
          </div>

          {/* Mobile sidebar overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: -288 }}
                  animate={{ x: 0 }}
                  exit={{ x: -288 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed left-0 top-0 z-50"
                >
                  <Sidebar onNavigate={() => setSidebarOpen(false)} />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <main className="min-h-screen pt-14">
            <div className="p-4">
              {children}
            </div>
          </main>
        </>
      ) : (
        <>
          <Sidebar />
          <main className="ml-72 min-h-screen">
            <div className="p-8">
              {children}
            </div>
          </main>
        </>
      )}
    </div>
  );
}