import { motion } from 'framer-motion';
import { useYarnCluesStore, CrochetStitch } from '@/store/useYarnCluesStore';
import { Eye, LayoutGrid, Play, ZoomIn, Sparkles } from 'lucide-react';
import { CrochetHookIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useRef, Suspense } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

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
    dtr: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="8" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
    blo: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="20" r="2" fill="currentColor" />
      </svg>
    ),
    flo: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <line x1="6" y1="18" x2="18" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="4" r="2" fill="currentColor" />
      </svg>
    ),
    spike: (
      <svg width={size} height={size} viewBox="0 0 24 24">
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
      <svg width={size} height={size} viewBox="0 0 24 24">
        <ellipse cx="12" cy="12" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="12" y1="6" x2="12" y2="18" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
  };

  return <div className="text-primary">{symbols[type]}</div>;
}

// 3D Crochet Stitch Component
function CrochetStitch3D({ 
  position, 
  type, 
  isHovered,
  highFidelity 
}: { 
  position: [number, number, number]; 
  type: CrochetStitch;
  isHovered: boolean;
  highFidelity: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.z = type === 'inc' ? Math.PI / 6 : 0;
    }
  });

  const color = type === 'inc' ? '#D4A5A5' : type === 'sc' ? '#E8D5C4' : '#C9A08E';
  
  return (
    <mesh ref={meshRef} position={position}>
      {type === 'sc' ? (
        // X shape for single crochet
        <group>
          <mesh rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.4, 0.08]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.8}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.08, 0.4, 0.08]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.8}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
        </group>
      ) : type === 'inc' ? (
        // V shape for increase
        <group>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 8]}>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.8}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
          <mesh position={[0.1, 0, 0]} rotation={[0, 0, -Math.PI / 8]}>
            <boxGeometry args={[0.08, 0.35, 0.08]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.8}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.3 : 0}
            />
          </mesh>
        </group>
      ) : (
        // Default oval for other stitches
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.8}
            emissive={isHovered ? color : '#000000'}
            emissiveIntensity={isHovered ? 0.3 : 0}
          />
        </mesh>
      )}
    </mesh>
  );
}

// 3D Preview Scene
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
        const radius = 0.5 + row * 0.4;
        const angleStep = (2 * Math.PI) / cells.length;
        // Offset for physical stacking
        const zOffset = row * 0.05;
        
        return cells.map((cell, i) => {
          const angle = i * angleStep - Math.PI / 2;
          // Stitch offset for interlocking
          const stitchOffset = row % 2 === 0 ? 0 : angleStep / 2;
          const x = Math.cos(angle + stitchOffset) * radius;
          const y = Math.sin(angle + stitchOffset) * radius;
          
          const isHovered = hoveredCell?.row === cell.row && hoveredCell?.stitch === cell.stitch;
          
          return (
            <CrochetStitch3D
              key={`${row}-${i}`}
              position={[x, y, zOffset]}
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
        minDistance={2}
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
    parseCrochetPattern, 
    chartMode, 
    setChartMode,
    hoveredCrochetCell,
    setHoveredCrochetCell,
    highFidelityMode,
    setHighFidelityMode
  } = useYarnCluesStore();

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
            <p className="text-muted-foreground">Parse shorthand into JIS standard charts</p>
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
            className="input-glass min-h-[200px] font-mono text-sm"
          />

          <div className="frosted-panel space-y-3">
            <h3 className="text-sm font-medium">JIS Syntax Guide</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><code className="bg-muted px-1 rounded">x</code> = SC (細編み)</div>
              <div><code className="bg-muted px-1 rounded">v</code> = Inc (増し目)</div>
              <div><code className="bg-muted px-1 rounded">a</code> = Dec (減らし目)</div>
              <div><code className="bg-muted px-1 rounded">t</code> = HDC (中長編み)</div>
              <div><code className="bg-muted px-1 rounded">f</code> = DC (長編み)</div>
              <div><code className="bg-muted px-1 rounded">e</code> = TR (長々編み)</div>
              <div><code className="bg-muted px-1 rounded">w</code> = DTR (三つ巻き)</div>
              <div><code className="bg-muted px-1 rounded">(2x, v)*6</code> = repeat</div>
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
                      <div className="relative" style={{ width: 350, height: 350 }}>
                        {Object.entries(rowGroups).map(([rowNum, cells]) => {
                          const row = parseInt(rowNum);
                          const radius = 30 + row * 40;
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
                                transition={{ delay: (row * cells.length + i) * 0.01 }}
                                className="absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
                                style={{
                                  left: 175 + x,
                                  top: 175 + y,
                                }}
                                onMouseEnter={() => setHoveredCrochetCell({ row: cell.row, stitch: cell.stitch })}
                                onMouseLeave={() => setHoveredCrochetCell(null)}
                              >
                                <CrochetSymbol type={cell.type} size={22} />
                              </motion.div>
                            );
                          });
                        })}
                        {/* Center magic ring */}
                        <div 
                          className="absolute w-6 h-6 -ml-3 -mt-3 flex items-center justify-center"
                          style={{ left: 175, top: 175 }}
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
                                className="w-6 h-6 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform"
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
            <h2 className="text-lg font-medium">3D Stitch Preview</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="hifi-toggle" className="text-sm">High Fidelity (AO)</Label>
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
              <div className="animate-pulse text-muted-foreground">Loading 3D Preview...</div>
            </div>
          }>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows={highFidelityMode}>
              <Crochet3DScene 
                chart={crochetChart} 
                hoveredCell={hoveredCrochetCell}
                highFidelity={highFidelityMode}
              />
            </Canvas>
          </Suspense>
        </div>

        <p className="text-xs text-muted-foreground mt-3 text-center">
          Drag to rotate • Scroll to zoom • Hover on chart to highlight stitch
        </p>
      </motion.div>
    </motion.div>
  );
}
