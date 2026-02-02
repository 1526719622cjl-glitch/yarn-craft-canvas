import { motion } from 'framer-motion';
import { useYarnCluesStore, KnittingStitch } from '@/store/useYarnCluesStore';
import { LayoutGrid, Paintbrush, RotateCcw, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

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

const stitchTools: { type: KnittingStitch; label: string; symbol: string }[] = [
  { type: 'knit', label: 'Knit', symbol: 'V' },
  { type: 'purl', label: 'Purl', symbol: '–' },
  { type: 'yo', label: 'Yarn Over', symbol: 'O' },
  { type: 'k2tog', label: 'K2tog', symbol: '/' },
  { type: 'ssk', label: 'SSK', symbol: '\\' },
  { type: 'cable4f', label: 'C4F', symbol: '⟋' },
  { type: 'cable4b', label: 'C4B', symbol: '⟍' },
];

function KnittingSymbol({ type, isWrongSide = false }: { type: KnittingStitch; isWrongSide?: boolean }) {
  // Flip symbols for wrong side view
  const effectiveType = isWrongSide 
    ? (type === 'knit' ? 'purl' : type === 'purl' ? 'knit' : type)
    : type;

  const symbols: Record<KnittingStitch, { symbol: string; bg: string }> = {
    knit: { symbol: 'V', bg: 'bg-yarn-cream' },
    purl: { symbol: '–', bg: 'bg-yarn-honey/50' },
    yo: { symbol: 'O', bg: 'bg-yarn-sky/50' },
    k2tog: { symbol: '/', bg: 'bg-yarn-rose/50' },
    ssk: { symbol: '\\', bg: 'bg-yarn-rose/50' },
    cable4f: { symbol: '⟋', bg: 'bg-yarn-lavender/50' },
    cable4b: { symbol: '⟍', bg: 'bg-yarn-lavender/50' },
    empty: { symbol: '', bg: 'bg-muted/30' },
  };

  const { symbol, bg } = symbols[effectiveType];

  return (
    <div className={`w-full h-full flex items-center justify-center ${bg} text-xs font-medium text-foreground/70`}>
      {symbol}
    </div>
  );
}

export default function KnittingEngine() {
  const { 
    knittingChart, 
    knittingWidth, 
    knittingHeight, 
    selectedKnittingStitch,
    showWrongSide,
    setSelectedKnittingStitch,
    setShowWrongSide,
    paintKnittingCell,
    initKnittingGrid,
    setKnittingDimensions,
    getWrongSideInstructions
  } = useYarnCluesStore();

  const [instructions, setInstructions] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (knittingChart.length === 0) {
      initKnittingGrid();
    }
  }, []);

  useEffect(() => {
    setInstructions(getWrongSideInstructions());
  }, [knittingChart, showWrongSide]);

  const handleCellInteraction = (row: number, stitch: number) => {
    paintKnittingCell(row, stitch);
  };

  const handleMouseDown = (row: number, stitch: number) => {
    setIsDragging(true);
    handleCellInteraction(row, stitch);
  };

  const handleMouseEnter = (row: number, stitch: number) => {
    if (isDragging) {
      handleCellInteraction(row, stitch);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetGrid = () => {
    initKnittingGrid();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-honey/30 flex items-center justify-center">
            <LayoutGrid className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Knitting Engine</h1>
            <p className="text-muted-foreground">Design professional charts with auto WS instructions</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Tools Panel */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Paintbrush className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">Stitch Tools</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {stitchTools.map((tool) => (
              <Button
                key={tool.type}
                variant={selectedKnittingStitch === tool.type ? 'default' : 'outline'}
                onClick={() => setSelectedKnittingStitch(tool.type)}
                className="h-14 flex flex-col gap-1 rounded-2xl soft-press"
              >
                <span className="text-lg font-bold">{tool.symbol}</span>
                <span className="text-xs">{tool.label}</span>
              </Button>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="ws-toggle" className="text-sm font-medium">
                Show Wrong Side
              </Label>
              <Switch
                id="ws-toggle"
                checked={showWrongSide}
                onCheckedChange={setShowWrongSide}
              />
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={resetGrid}
            className="w-full rounded-2xl soft-press"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Grid
          </Button>

          <div className="frosted-panel">
            <p className="text-xs text-muted-foreground mb-2">Grid Size</p>
            <p className="text-lg font-medium">
              {knittingWidth} × {knittingHeight}
            </p>
          </div>
        </motion.div>

        {/* Main Chart */}
        <motion.div variants={itemVariants} className="xl:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">
              {showWrongSide ? 'Wrong Side View' : 'Right Side View'}
            </h2>
            <span className="text-sm text-muted-foreground">
              Click and drag to paint
            </span>
          </div>

          <div className="overflow-auto max-h-[500px] rounded-2xl bg-muted/20 p-4">
            <div 
              className="inline-grid gap-[1px]"
              style={{ 
                gridTemplateColumns: `repeat(${knittingWidth}, 28px)`,
              }}
            >
              {/* Render rows from top (highest row number) to bottom */}
              {Array.from({ length: knittingHeight }).map((_, rowIdx) => {
                const row = knittingHeight - 1 - rowIdx; // Reverse order
                const isWS = row % 2 === 1;
                
                return Array.from({ length: knittingWidth }).map((_, stitchIdx) => {
                  // On WS, show stitches from right to left
                  const stitch = showWrongSide && isWS 
                    ? knittingWidth - 1 - stitchIdx 
                    : stitchIdx;
                  
                  const cell = knittingChart.find(c => c.row === row && c.stitch === stitch);
                  
                  return (
                    <motion.div
                      key={`${row}-${stitch}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (rowIdx * knittingWidth + stitchIdx) * 0.002 }}
                      className="w-7 h-7 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 select-none"
                      onMouseDown={() => handleMouseDown(row, stitch)}
                      onMouseEnter={() => handleMouseEnter(row, stitch)}
                      style={{
                        boxShadow: isWS && showWrongSide 
                          ? 'inset 0 1px 3px rgba(0,0,0,0.1)' 
                          : '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <KnittingSymbol 
                        type={cell?.type || 'knit'} 
                        isWrongSide={showWrongSide && isWS}
                      />
                    </motion.div>
                  );
                });
              })}
            </div>

            {/* Row numbers */}
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>1</span>
              <span>{knittingWidth}</span>
            </div>
          </div>

          {/* 3D Texture Preview */}
          <div className="mt-6 frosted-panel">
            <h3 className="text-sm font-medium mb-3">Stitch Texture Simulation</h3>
            <div className="flex flex-wrap gap-0.5">
              {knittingChart.slice(0, 40).map((cell, i) => (
                <motion.div
                  key={i}
                  initial={{ rotateX: 45 }}
                  animate={{ rotateX: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="w-4 h-5 rounded-sm"
                  style={{
                    background: cell.type === 'knit' 
                      ? 'linear-gradient(180deg, hsl(40 45% 85%), hsl(40 40% 75%))' 
                      : cell.type === 'purl'
                      ? 'linear-gradient(0deg, hsl(40 40% 80%), hsl(40 35% 70%))'
                      : 'linear-gradient(135deg, hsl(var(--yarn-sky)), hsl(var(--yarn-lavender)))',
                    boxShadow: cell.type === 'knit' 
                      ? '0 2px 4px rgba(0,0,0,0.15)' 
                      : 'inset 0 1px 3px rgba(0,0,0,0.1)',
                  }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Instructions Panel */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">Written Instructions</h2>
          </div>

          <div className="space-y-2 max-h-[400px] overflow-auto">
            {instructions.map((instruction, i) => {
              const isWS = instruction.includes('(WS)');
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`frosted-panel py-2 px-3 text-xs ${
                    isWS ? 'bg-muted/50' : ''
                  }`}
                >
                  <p className={`font-mono ${isWS ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {instruction}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="frosted-panel text-center">
            <p className="text-xs text-muted-foreground mb-1">Legend</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="font-bold">K</span> = Knit
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">P</span> = Purl
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">YO</span> = Yarn Over
              </div>
              <div className="flex items-center gap-1">
                <span className="font-bold">K2TOG</span> = Dec
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
