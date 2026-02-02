import { motion } from 'framer-motion';
import { useYarnCluesStore, CrochetStitch } from '@/store/useYarnCluesStore';
import { Eye, LayoutGrid, Play, ZoomIn, Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { CrochetHookIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useMemo, Suspense } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { parseCrochetPattern, toStoreFormat, ParseResult } from '@/lib/crochetParser';
import { CrochetYarnStitch } from '@/components/3d/YarnSimulation';

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

// JIS Crochet symbol rendering - Complete set
function CrochetSymbol({ type, size = 24, rotation = 0 }: { type: CrochetStitch; size?: number; rotation?: number }) {
  const symbols: Record<CrochetStitch, React.ReactNode> = {
    chain: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <ellipse cx="12" cy="12" rx="8" ry="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    slip: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
    ),
    sc: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    hdc: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    dc: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    tr: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="6" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="8" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    dtr: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    inc: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="4" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="20" y1="20" x2="12" y2="4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    dec: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
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
    blo: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="20" r="2" fill="currentColor" />
      </svg>
    ),
    flo: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="4" r="2" fill="currentColor" />
      </svg>
    ),
    spike: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <line x1="12" y1="2" x2="12" y2="22" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <line x1="6" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    popcorn: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" fill="currentColor" opacity="0.3" />
        <circle cx="12" cy="12" r="5" fill="currentColor" />
      </svg>
    ),
    bobble: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <ellipse cx="12" cy="12" rx="7" ry="9" fill="currentColor" opacity="0.5" />
        <ellipse cx="12" cy="12" rx="4" ry="6" fill="currentColor" />
      </svg>
    ),
    puff: (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}rad)` }}>
        <ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  };

  return <div className="text-primary">{symbols[type]}</div>;
}

// 3D Preview Scene with TubeGeometry yarn
function Crochet3DScene({ 
  chart, 
  hoveredCell,
  highFidelity 
}: { 
  chart: { row: number; stitch: number; type: CrochetStitch }[];
  hoveredCell: { row: number; stitch: number } | null;
  highFidelity: boolean;
}) {
  const rowGroups = chart.reduce((acc, cell) => {
    if (!acc[cell.row]) acc[cell.row] = [];
    acc[cell.row].push(cell);
    return acc;
  }, {} as Record<number, typeof chart>);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow={highFidelity} />
      <pointLight position={[-5, 5, -5]} intensity={0.3} />
      
      {highFidelity && <Environment preset="apartment" />}
      
      {Object.entries(rowGroups).map(([rowNum, cells]) => {
        const row = parseInt(rowNum);
        const radius = 0.3 + row * 0.35;
        const angleStep = (2 * Math.PI) / cells.length;
        const zOffset = row * 0.04;
        
        return cells.map((cell, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const stitchOffset = row % 2 === 0 ? 0 : angleStep / 2;
          const x = Math.cos(angle + stitchOffset) * radius;
          const y = Math.sin(angle + stitchOffset) * radius;
          
          const isHovered = hoveredCell?.row === cell.row && hoveredCell?.stitch === cell.stitch;
          
          return (
            <CrochetYarnStitch
              key={`${row}-${i}`}
              position={[x, y, zOffset]}
              rotation={angle + stitchOffset + Math.PI / 2}
              type={cell.type}
              isHovered={isHovered}
              highFidelity={highFidelity}
            />
          );
        });
      })}
      
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        minDistance={1.5}
        maxDistance={10}
      />
    </>
  );
}

export default function CrochetEngine() {
  const { 
    crochetInput, 
    setCrochetInput, 
    crochetChart, 
    setCrochetChart,
    chartMode, 
    setChartMode,
    hoveredCrochetCell,
    setHoveredCrochetCell,
    highFidelityMode,
    setHighFidelityMode
  } = useYarnCluesStore();

  // Parse pattern with advanced NLP parser
  const parseResult: ParseResult = useMemo(() => {
    return parseCrochetPattern(crochetInput);
  }, [crochetInput]);

  // Update store when parse result changes
  useEffect(() => {
    const storeFormat = toStoreFormat(parseResult.stitches);
    setCrochetChart(storeFormat);
  }, [parseResult.stitches, setCrochetChart]);

  // Group by rows
  const rowGroups = crochetChart.reduce((acc, cell) => {
    if (!acc[cell.row]) acc[cell.row] = [];
    acc[cell.row].push(cell);
    return acc;
  }, {} as Record<number, typeof crochetChart>);

  // Total stitch count
  const totalStitches = crochetChart.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-lavender/30 flex items-center justify-center">
            <CrochetHookIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Crochet Engine</h1>
            <p className="text-muted-foreground">Advanced NLP parser with JIS charting & 3D yarn simulation</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            className="input-glass min-h-[180px] font-mono text-sm"
          />

          {/* Stitch Count Validator */}
          <div className="frosted-panel space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Stitch Count Validator</h3>
              <span className="text-xs text-muted-foreground">{totalStitches} total</span>
            </div>
            <div className="max-h-[150px] overflow-auto space-y-1">
              {parseResult.validations.map((v) => (
                <div 
                  key={v.row} 
                  className={`flex items-center justify-between text-xs py-1 px-2 rounded-lg ${
                    v.isValid ? 'bg-muted/30' : 'bg-destructive/10'
                  }`}
                >
                  <span className="font-medium">Row {v.row}</span>
                  <div className="flex items-center gap-2">
                    <span>{v.stitchCount} sts</span>
                    {v.message && (
                      <span className="text-muted-foreground">{v.message}</span>
                    )}
                    {v.isValid ? (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="frosted-panel space-y-3">
            <h3 className="text-sm font-medium">JIS Syntax Guide</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><code className="bg-muted px-1 rounded">x</code> = SC (細編み)</div>
              <div><code className="bg-muted px-1 rounded">v</code> = Inc (増し目)</div>
              <div><code className="bg-muted px-1 rounded">a</code> = Dec (減らし目)</div>
              <div><code className="bg-muted px-1 rounded">t</code> = HDC (中長編み)</div>
              <div><code className="bg-muted px-1 rounded">f</code> = DC (長編み)</div>
              <div><code className="bg-muted px-1 rounded">blo</code> = Back Loop</div>
              <div><code className="bg-muted px-1 rounded">w</code> = DTR (三つ巻き)</div>
              <div><code className="bg-muted px-1 rounded">(2x, v)*6</code> = repeat</div>
            </div>
          </div>
        </motion.div>

        {/* Chart View with Zoom/Pan */}
        <motion.div variants={itemVariants} className="lg:col-span-2 glass-card p-6 space-y-6">
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
                <CrochetHookIcon className="w-4 h-4 mr-1" />
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

          <TransformWrapper
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="flex gap-2 mb-4">
                  <Button variant="outline" size="sm" onClick={() => zoomIn()} className="rounded-xl">
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => zoomOut()} className="rounded-xl">
                    <ZoomIn className="w-4 h-4 rotate-180" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => resetTransform()} className="rounded-xl">
                    Reset
                  </Button>
                </div>
                
                <TransformComponent wrapperClass="!w-full" contentClass="!w-full">
                  {chartMode === 'circular' ? (
                    <div className="flex items-center justify-center min-h-[350px] w-full">
                      <div className="relative" style={{ width: 400, height: 400 }}>
                        {/* Polar coordinate circular chart */}
                        {Object.entries(rowGroups).map(([rowNum, cells]) => {
                          const row = parseInt(rowNum);
                          const radius = 30 + row * 40;
                          const angleStep = (2 * Math.PI) / cells.length;

                          return cells.map((cell, i) => {
                            // Polar coordinates: x = r * cos(θ), y = r * sin(θ)
                            const angle = i * angleStep - Math.PI / 2;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            
                            // Symbol rotation follows curvature
                            const symbolRotation = angle + Math.PI / 2;

                            return (
                              <motion.div
                                key={`${row}-${i}`}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (row * cells.length + i) * 0.01 }}
                                className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform ${
                                  hoveredCrochetCell?.row === cell.row && hoveredCrochetCell?.stitch === cell.stitch
                                    ? 'ring-2 ring-primary scale-125 z-10'
                                    : ''
                                }`}
                                style={{
                                  left: 200 + x,
                                  top: 200 + y,
                                }}
                                onMouseEnter={() => setHoveredCrochetCell({ row: cell.row, stitch: cell.stitch })}
                                onMouseLeave={() => setHoveredCrochetCell(null)}
                              >
                                <CrochetSymbol type={cell.type} size={22} rotation={symbolRotation} />
                              </motion.div>
                            );
                          });
                        })}
                        {/* Center magic ring */}
                        <div 
                          className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center"
                          style={{ left: 200, top: 200 }}
                        >
                          <CrochetSymbol type="magic" size={28} />
                        </div>
                        {/* Row labels */}
                        {Object.keys(rowGroups).map((rowNum) => {
                          const row = parseInt(rowNum);
                          const radius = 30 + row * 40 + 20;
                          return (
                            <div
                              key={`label-${row}`}
                              className="absolute text-xs text-muted-foreground font-medium"
                              style={{
                                left: 200 + radius,
                                top: 200 - 8,
                              }}
                            >
                              R{row}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {Object.entries(rowGroups).map(([rowNum, cells]) => (
                        <motion.div
                          key={rowNum}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: parseInt(rowNum) * 0.05 }}
                          className="flex items-center gap-2"
                        >
                          <span className="w-12 text-xs font-medium text-muted-foreground">
                            R{rowNum}
                          </span>
                          <div className="flex flex-wrap gap-1 frosted-panel py-2 px-3 flex-1">
                            {cells.map((cell, i) => (
                              <div 
                                key={i} 
                                className={`w-6 h-6 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform ${
                                  hoveredCrochetCell?.row === cell.row && hoveredCrochetCell?.stitch === cell.stitch
                                    ? 'ring-2 ring-primary scale-125'
                                    : ''
                                }`}
                                onMouseEnter={() => setHoveredCrochetCell({ row: cell.row, stitch: cell.stitch })}
                                onMouseLeave={() => setHoveredCrochetCell(null)}
                              >
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
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
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
              <Label htmlFor="hifi-toggle" className="text-sm">High Quality (AO)</Label>
              <Switch
                id="hifi-toggle"
                checked={highFidelityMode}
                onCheckedChange={setHighFidelityMode}
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
            <Canvas camera={{ position: [0, 0, 4], fov: 50 }} shadows={highFidelityMode}>
              <Crochet3DScene 
                chart={crochetChart} 
                hoveredCell={hoveredCrochetCell}
                highFidelity={highFidelityMode}
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
