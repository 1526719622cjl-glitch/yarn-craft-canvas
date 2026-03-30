import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Library, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { usePatternLibrary } from '@/hooks/usePatternLibrary';
import { PatternCard } from './PatternCard';
import { PatternUploadDialog } from './PatternUploadDialog';

import { useNavigate } from 'react-router-dom';

interface PatternLibraryProps {
  category: 'crochet' | 'knitting';
  icon: React.ReactNode;
}

export function PatternLibrary({ category, icon }: PatternLibraryProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    patterns, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery, createPattern, updatePattern,
    deletePattern, uploadFile,
  } = usePatternLibrary(category);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const filteredPatterns = showFavoritesOnly
    ? patterns.filter(p => (p as any).is_favorite === true)
    : patterns;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">
              {t(category === 'crochet' ? 'pattern.crochetLibrary' : 'pattern.knittingLibrary')}
            </h1>
            <p className="text-muted-foreground">{t('pattern.librarySubtitle')}</p>
          </div>
        </div>
        {user && (
          <Button onClick={() => setUploadOpen(true)} className="rounded-2xl">
            <Plus className="w-4 h-4 mr-2" />
            {t('pattern.addPattern')}
          </Button>
        )}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('pattern.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="all">{t('pattern.filter.all')}</TabsTrigger>
              <TabsTrigger value="preparing">{t('pattern.status.preparing')}</TabsTrigger>
              <TabsTrigger value="in_progress">{t('pattern.status.inProgress')}</TabsTrigger>
              <TabsTrigger value="completed">{t('pattern.status.completed')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="icon"
            className="rounded-xl h-9 w-9 shrink-0"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Grid */}
      {!user ? (
        <div className="glass-card p-12 text-center">
          <Library className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('pattern.signInToView')}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/auth')}>
            {t('common.signIn')}
          </Button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="glass-card aspect-[3/4] animate-pulse bg-muted/30" />
          ))}
        </div>
      ) : filteredPatterns.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-4xl mb-4">{showFavoritesOnly ? '❤️' : '📂'}</p>
          <p className="text-muted-foreground">{showFavoritesOnly ? t('pattern.favorites') : t('pattern.empty')}</p>
          {!showFavoritesOnly && (
            <Button variant="outline" className="mt-4" onClick={() => setUploadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />{t('pattern.addFirst')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPatterns.map(p => (
            <PatternCard
              key={p.id}
              pattern={p}
              onClick={() => navigate(`/${category}/${p.id}`)}
              onDelete={() => deletePattern(p.id)}
              onStatusChange={(status) => updatePattern(p.id, { status })}
              onToggleFavorite={() => updatePattern(p.id, { is_favorite: !(p as any).is_favorite } as any)}
            />
          ))}
        </div>
      )}

      <PatternUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        category={category}
        onCreate={createPattern}
        onUploadFile={uploadFile}
        onNavigate={(id) => navigate(`/${category}/${id}`)}
      />

    </motion.div>
  );
}
