import { motion } from 'framer-motion';
import { useYarnCluesStore, KnittingStitch } from '@/store/useYarnCluesStore';
import { Paintbrush, RotateCcw, FileText, Sparkles, Grid } from 'lucide-react';
import { KnittingNeedlesIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useEffect, useState, Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { KnittingYarnStitch } from '@/components/3d/YarnSimulation';

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

// Ruler component
function ChartRuler({ 
  type, 
  size, 
  cellSize 
}: { 
  type: 'horizontal' | 'vertical'; 
  size: number; 
  cellSize: number;
}) {
  const rulerSize = 20;
  
  if (type === 'horizontal') {
    return (
      <div 
        className="flex bg-muted/40 border-b border-border/50 select-none"
        style={{ marginLeft: rulerSize, height: rulerSize }}
      >
        {Array.from({ length: size }).map((_, i) => {
          const isMajor = (i + 1) % 10 === 0;
          const isMinor = (i + 1) % 5 === 0;
          return (
            <div
              key={i}
              className="relative flex items-end justify-center"
              style={{ 
                width: cellSize, 
                borderRight: isMajor ? '1px solid hsl(var(--primary) / 0.4)' : 'none'
              }}
            >
              {isMajor && (
                <span className="text-[8px] font-medium text-muted-foreground pb-0.5">
                  {i + 1}
                </span>
              )}
              {!isMajor && isMinor && (
                <div className="w-[1px] h-1.5 bg-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div 
      className="flex flex-col bg-muted/40 border-r border-border/50 select-none"
      style={{ width: rulerSize }}
    >
      <div style={{ height: rulerSize }} />
      {Array.from({ length: size }).map((_, i) => {
        const rowNum = size - i;
        const isMajor = rowNum % 10 === 0 || rowNum === 1;
        const isWS = (size - 1 - i) % 2 === 1;
        return (
          <div
            key={i}
            className={`relative flex items-center justify-end pr-1 ${
              isWS ? 'bg-muted/30' : ''
            }`}
            style={{ 
              height: cellSize,
              borderBottom: isMajor ? '1px solid hsl(var(--primary) / 0.4)' : 'none'
            }}
          >
            {isMajor && (
              <span className="text-[8px] font-medium text-muted-foreground">
                {rowNum}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 3D Preview Scene with TubeGeometry yarn
function Knitting3DScene({ 
  chart, 
  width,
  height,
  hoveredCell,
  highFidelity 
}: { 
  chart: { row: number; stitch: number; type: KnittingStitch }[];
  width: number;
  height: number;
  hoveredCell: { row: number; stitch: number } | null;
  highFidelity: boolean;
}) {
  const spacing = 0.3;
  const offsetX = (width * spacing) / 2;
  const offsetY = (height * spacing) / 2;
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow={highFidelity} />
      <pointLight position={[-5, 5, -5]} intensity={0.2} />
      
      {highFidelity && <Environment preset="apartment" />}
      
      {chart.map((cell) => {
        // Physical stacking - alternate rows offset slightly for interlocking
        const xOffset = cell.row % 2 === 0 ? 0 : spacing / 2;
        const x = cell.stitch * spacing - offsetX + xOffset;
        const y = cell.row * spacing * 0.7 - offsetY;
        const z = cell.row * 0.015;
        
        const isHovered = hoveredCell?.row === cell.row && hoveredCell?.stitch === cell.stitch;
        
        return (
          <KnittingYarnStitch
            key={`${cell.row}-${cell.stitch}`}
            position={[x, y, z]}
            type={cell.type}
            isHovered={isHovered}
            highFidelity={highFidelity}
          />
        );
      })}
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={15}
      />
    </>
  );
}

export default function KnittingEngine() {
  const { 
    knittingChart, 
    knittingWidth, 
    knittingHeight, 
    selectedKnittingStitch,
    showWrongSide,
    hoveredKnittingCell,
    knittingHighFidelityMode,
    setSelectedKnittingStitch,
    setShowWrongSide,
    setHoveredKnittingCell,
    setKnittingHighFidelityMode,
    paintKnittingCell,
    initKnittingGrid,
    setKnittingDimensions,
    getWrongSideInstructions
  } = useYarnCluesStore();

  const [instructions, setInstructions] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showGridLines, setShowGridLines] = useState(true);
  const [tempWidth, setTempWidth] = useState(knittingWidth);
  const [tempHeight, setTempHeight] = useState(knittingHeight);

  useEffect(() => {
    if (knittingChart.length === 0) {
      initKnittingGrid();
    }
  }, []);

  useEffect(() => {
    setInstructions(getWrongSideInstructions());
  }, [knittingChart, showWrongSide, getWrongSideInstructions]);

  // Stitch count per row validation
  const rowCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const cell of knittingChart) {
      counts[cell.row] = (counts[cell.row] || 0) + 1;
    }
    return counts;
  }, [knittingChart]);

  const handleCellInteraction = (row: number, stitch: number) => {
    paintKnittingCell(row, stitch);
  };

  const handleMouseDown = (row: number, stitch: number) => {
    setIsDragging(true);
    handleCellInteraction(row, stitch);
  };

  const handleMouseEnter = (row: number, stitch: number) => {
    setHoveredKnittingCell({ row, stitch });
    if (isDragging) {
      handleCellInteraction(row, stitch);
    }
  };

  const handleMouseLeave = () => {
    setHoveredKnittingCell(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetGrid = () => {
    initKnittingGrid();
  };

  const applyDimensions = () => {
    setKnittingDimensions(tempWidth, tempHeight);
  };

  const cellSize = 28;

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
            <KnittingNeedlesIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Knitting Engine</h1>
            <p className="text-muted-foreground">Professional chart designer with auto WS instructions & 3D yarn simulation</p>
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

          {/* Grid Dimensions */}
          <div className="space-y-3 pt-4 border-t border-border/50">
            <h3 className="text-sm font-medium">Chart Dimensions</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Width</Label>
                <Input
                  type="number"
                  value={tempWidth}
                  onChange={(e) => setTempWidth(Number(e.target.value))}
                  className="h-9"
                  min={1}
                  max={100}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Height</Label>
                <Input
                  type="number"
                  value={tempHeight}
                  onChange={(e) => setTempHeight(Number(e.target.value))}
                  className="h-9"
                  min={1}
                  max={100}
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={applyDimensions}
              className="w-full rounded-xl"
            >
              Apply Dimensions
            </Button>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="grid-toggle" className="text-sm font-medium">
                  Grid Lines
                </Label>
              </div>
              <Switch
                id="grid-toggle"
                checked={showGridLines}
                onCheckedChange={setShowGridLines}
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

        {/* Main Chart with Rulers */}
        <motion.div variants={itemVariants} className="xl:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">
              {showWrongSide ? 'Wrong Side View' : 'Right Side View'}
            </h2>
            <span className="text-sm text-muted-foreground">
              Click and drag to paint
            </span>
          </div>

          <div className="overflow-auto max-h-[500px] rounded-2xl bg-muted/20">
            <div className="inline-flex">
              {/* Vertical Ruler */}
              <ChartRuler type="vertical" size={knittingHeight} cellSize={cellSize} />
              
              <div className="flex flex-col">
                {/* Horizontal Ruler */}
                <ChartRuler type="horizontal" size={knittingWidth} cellSize={cellSize} />
                
                {/* Grid */}
                <div 
                  className={`inline-grid ${showGridLines ? 'gap-[1px]' : 'gap-0'}`}
                  style={{ 
                    gridTemplateColumns: `repeat(${knittingWidth}, ${cellSize}px)`,
                  }}
                >
                  {Array.from({ length: knittingHeight }).map((_, rowIdx) => {
                    const row = knittingHeight - 1 - rowIdx;
                    const isWS = row % 2 === 1;
                    const isMajorRow = (row + 1) % 10 === 0;
                    
                    return Array.from({ length: knittingWidth }).map((_, stitchIdx) => {
                      const stitch = showWrongSide && isWS 
                        ? knittingWidth - 1 - stitchIdx 
                        : stitchIdx;
                      
                      const cell = knittingChart.find(c => c.row === row && c.stitch === stitch);
                      const isHovered = hoveredKnittingCell?.row === row && hoveredKnittingCell?.stitch === stitch;
                      const isMajorCol = (stitchIdx + 1) % 10 === 0;
                      
                      return (
                        <div
                          key={`${row}-${stitch}`}
                          className={`cursor-pointer transition-all select-none ${
                            isHovered ? 'ring-2 ring-primary/50 z-10' : ''
                          } ${
                            showGridLines && isMajorRow && isMajorCol ? 'border-r-2 border-b-2 border-primary/30' :
                            showGridLines && isMajorRow ? 'border-b-2 border-primary/30' :
                            showGridLines && isMajorCol ? 'border-r-2 border-primary/30' : ''
                          }`}
                          style={{
                            width: cellSize,
                            height: cellSize,
                            boxShadow: isWS && showWrongSide 
                              ? 'inset 0 1px 3px rgba(0,0,0,0.1)' 
                              : '0 1px 2px rgba(0,0,0,0.05)',
                          }}
                          onMouseDown={() => handleMouseDown(row, stitch)}
                          onMouseEnter={() => handleMouseEnter(row, stitch)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <KnittingSymbol 
                            type={cell?.type || 'knit'} 
                            isWrongSide={showWrongSide && isWS}
                          />
                        </div>
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Instructions Panel */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">Written Instructions</h2>
          </div>

          <div className="space-y-2 max-h-[300px] overflow-auto">
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

      {/* 3D Preview */}
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-medium">3D Yarn Simulation</h2>
            <span className="text-xs text-muted-foreground ml-2">(TubeGeometry + Fuzzy Shader)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="knit-hifi-toggle" className="text-sm">High Quality (AO)</Label>
              <Switch
                id="knit-hifi-toggle"
                checked={knittingHighFidelityMode}
                onCheckedChange={setKnittingHighFidelityMode}
              />
            </div>
          </div>
        </div>

        <div className="h-[400px] rounded-2xl overflow-hidden bg-gradient-to-b from-muted/30 to-muted/10">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading 3D Yarn Preview...</div>
            </div>
          }>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows={knittingHighFidelityMode}>
              <Knitting3DScene 
                chart={knittingChart}
                width={knittingWidth}
                height={knittingHeight}
                hoveredCell={hoveredKnittingCell}
                highFidelity={knittingHighFidelityMode}
              />
            </Canvas>
          </Suspense>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Drag to rotate • Scroll to zoom • Hover on chart to highlight stitch with emissive glow
        </p>
      </motion.div>
    </motion.div>
  );
}
