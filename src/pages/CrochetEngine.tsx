import { motion } from 'framer-motion';
import { useYarnCluesStore, CrochetStitch } from '@/store/useYarnCluesStore';
import { Circle, Eye, LayoutGrid, Play } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

// JIS Crochet symbol rendering
function CrochetSymbol({ type, size = 24 }: { type: CrochetStitch; size?: number }) {
  const symbols: Record<CrochetStitch, React.ReactNode> = {
    chain: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <ellipse cx="12" cy="12" rx="8" ry="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    slip: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    sc: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    hdc: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    dc: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    tr: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    inc: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="4" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    dec: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="4" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    magic: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
  };

  return <div className="text-primary">{symbols[type]}</div>;
}

export default function CrochetEngine() {
  const { crochetInput, setCrochetInput, crochetChart, parseCrochetPattern, chartMode, setChartMode } = useYarnCluesStore();

  useEffect(() => {
    parseCrochetPattern();
  }, [crochetInput]);

  const rowGroups = crochetChart.reduce((acc, cell) => {
    if (!acc[cell.row]) acc[cell.row] = [];
    acc[cell.row].push(cell);
    return acc;
  }, {} as Record<number, typeof crochetChart>);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-6xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-lavender/30 flex items-center justify-center">
            <Circle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Crochet Engine</h1>
            <p className="text-muted-foreground">Parse shorthand into JIS standard charts</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pattern Input */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-lg">✍️</span>
            <h2 className="text-lg font-medium">Pattern Shorthand</h2>
          </div>

          <Textarea
            value={crochetInput}
            onChange={(e) => setCrochetInput(e.target.value)}
            placeholder="Enter pattern commands..."
            className="input-glass min-h-[200px] font-mono text-sm"
          />

          <div className="frosted-panel space-y-3">
            <h3 className="text-sm font-medium">Syntax Guide</h3>
            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div><code className="bg-muted px-1 rounded">6x</code> = 6 single crochet</div>
              <div><code className="bg-muted px-1 rounded">v</code> = increase (V)</div>
              <div><code className="bg-muted px-1 rounded">(2x, v)*6</code> = repeat 6×</div>
              <div><code className="bg-muted px-1 rounded">o</code> = double crochet</div>
            </div>
          </div>

          <Button 
            onClick={parseCrochetPattern}
            className="w-full rounded-2xl h-12 soft-press"
          >
            <Play className="w-4 h-4 mr-2" />
            Parse Pattern
          </Button>
        </motion.div>

        {/* Chart View */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Chart View</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartMode === 'circular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('circular')}
                className="rounded-xl soft-press"
              >
                <Circle className="w-4 h-4 mr-1" />
                Circular
              </Button>
              <Button
                variant={chartMode === 'linear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('linear')}
                className="rounded-xl soft-press"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Linear
              </Button>
            </div>
          </div>

          {chartMode === 'circular' ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="relative">
                {Object.entries(rowGroups).map(([rowNum, cells]) => {
                  const row = parseInt(rowNum);
                  const radius = 30 + row * 35;
                  const angleStep = (2 * Math.PI) / cells.length;

                  return cells.map((cell, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;

                    return (
                      <motion.div
                        key={`${row}-${i}`}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: (row * cells.length + i) * 0.02 }}
                        className="absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center"
                        style={{
                          left: 150 + x,
                          top: 150 + y,
                        }}
                      >
                        <CrochetSymbol type={cell.type} size={22} />
                      </motion.div>
                    );
                  });
                })}
                {/* Center magic ring */}
                <div 
                  className="absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center"
                  style={{ left: 150, top: 150 }}
                >
                  <CrochetSymbol type="magic" size={24} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-auto">
              {Object.entries(rowGroups).map(([rowNum, cells]) => (
                <motion.div
                  key={rowNum}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: parseInt(rowNum) * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <span className="w-12 text-xs font-medium text-muted-foreground">
                    R{rowNum}
                  </span>
                  <div className="flex flex-wrap gap-1 frosted-panel py-2 px-3 flex-1">
                    {cells.map((cell, i) => (
                      <div key={i} className="w-6 h-6 flex items-center justify-center">
                        <CrochetSymbol type={cell.type} size={18} />
                      </div>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">
                    {cells.length}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* 3D-like texture preview */}
          <div className="frosted-panel">
            <h3 className="text-sm font-medium mb-3">Stitch Texture Preview</h3>
            <div className="flex flex-wrap gap-1">
              {crochetChart.slice(0, 30).map((cell, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateY: 90 }}
                  animate={{ rotateY: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="w-5 h-6 rounded-sm flex items-center justify-center text-xs"
                  style={{
                    background: cell.type === 'inc' 
                      ? 'linear-gradient(135deg, hsl(var(--yarn-rose)), hsl(var(--yarn-honey)))' 
                      : 'linear-gradient(135deg, hsl(var(--yarn-cream)), hsl(var(--muted)))',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  }}
                >
                  {cell.type === 'sc' ? '×' : cell.type === 'inc' ? 'V' : '○'}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
