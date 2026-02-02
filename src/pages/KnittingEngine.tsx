import { motion } from 'framer-motion';
import { useYarnCluesStore, KnittingStitch } from '@/store/useYarnCluesStore';
import { Paintbrush, RotateCcw, FileText, Sparkles } from 'lucide-react';
import { KnittingNeedlesIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useState, Suspense, useRef } from 'react';
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

// 3D Knitting Stitch Component
function KnittingStitch3D({ 
  position, 
  type, 
  isHovered,
  highFidelity 
}: { 
  position: [number, number, number]; 
  type: KnittingStitch;
  isHovered: boolean;
  highFidelity: boolean;
}) {
  const meshRef = useRef<THREE.Group>(null);
  
  const knitColor = '#E8D5C4';
  const purlColor = '#D4C4B4';
  const yoColor = '#B4C4D4';
  
  const color = type === 'knit' ? knitColor : type === 'purl' ? purlColor : yoColor;
  
  return (
    <group ref={meshRef} position={position}>
      {type === 'knit' ? (
        // V shape for knit stitch
        <group>
          <mesh position={[-0.08, 0.08, 0]} rotation={[0, 0, Math.PI / 6]}>
            <cylinderGeometry args={[0.03, 0.03, 0.25, 8]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.9}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.4 : 0}
            />
          </mesh>
          <mesh position={[0.08, 0.08, 0]} rotation={[0, 0, -Math.PI / 6]}>
            <cylinderGeometry args={[0.03, 0.03, 0.25, 8]} />
            <meshStandardMaterial 
              color={color} 
              roughness={0.9}
              emissive={isHovered ? color : '#000000'}
              emissiveIntensity={isHovered ? 0.4 : 0}
            />
          </mesh>
        </group>
      ) : type === 'purl' ? (
        // Horizontal bar for purl stitch
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 0.3, 8]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.9}
            emissive={isHovered ? color : '#000000'}
            emissiveIntensity={isHovered ? 0.4 : 0}
          />
        </mesh>
      ) : type === 'yo' ? (
        // Circle for yarn over
        <mesh>
          <torusGeometry args={[0.1, 0.03, 8, 16]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.8}
            emissive={isHovered ? color : '#000000'}
            emissiveIntensity={isHovered ? 0.4 : 0}
          />
        </mesh>
      ) : (
        // Default small sphere
        <mesh>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial 
            color={color} 
            roughness={0.9}
            emissive={isHovered ? color : '#000000'}
            emissiveIntensity={isHovered ? 0.4 : 0}
          />
        </mesh>
      )}
    </group>
  );
}

// 3D Preview Scene
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
  const spacing = 0.35;
  const offsetX = (width * spacing) / 2;
  const offsetY = (height * spacing) / 2;
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow={highFidelity} />
      <pointLight position={[-5, 5, -5]} intensity={0.2} />
      
      {highFidelity && <Environment preset="apartment" />}
      
      {chart.map((cell) => {
        // Physical stacking - alternate rows offset slightly
        const xOffset = cell.row % 2 === 0 ? 0 : spacing / 2;
        const x = cell.stitch * spacing - offsetX + xOffset;
        const y = cell.row * spacing * 0.8 - offsetY; // Rows slightly compressed
        const z = cell.row * 0.02; // Slight z-stacking
        
        const isHovered = hoveredCell?.row === cell.row && hoveredCell?.stitch === cell.stitch;
        
        return (
          <KnittingStitch3D
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
        minDistance={2}
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
              {Array.from({ length: knittingHeight }).map((_, rowIdx) => {
                const row = knittingHeight - 1 - rowIdx;
                const isWS = row % 2 === 1;
                
                return Array.from({ length: knittingWidth }).map((_, stitchIdx) => {
                  const stitch = showWrongSide && isWS 
                    ? knittingWidth - 1 - stitchIdx 
                    : stitchIdx;
                  
                  const cell = knittingChart.find(c => c.row === row && c.stitch === stitch);
                  const isHovered = hoveredKnittingCell?.row === row && hoveredKnittingCell?.stitch === stitch;
                  
                  return (
                    <motion.div
                      key={`${row}-${stitch}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: (rowIdx * knittingWidth + stitchIdx) * 0.002 }}
                      className={`w-7 h-7 rounded-sm cursor-pointer transition-all select-none ${
                        isHovered ? 'ring-2 ring-primary/50' : ''
                      }`}
                      onMouseDown={() => handleMouseDown(row, stitch)}
                      onMouseEnter={() => handleMouseEnter(row, stitch)}
                      onMouseLeave={handleMouseLeave}
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

            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>1</span>
              <span>{knittingWidth}</span>
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
            <h2 className="text-lg font-medium">3D Stitch Preview</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="knit-hifi-toggle" className="text-sm">High Fidelity (AO)</Label>
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
              <div className="animate-pulse text-muted-foreground">Loading 3D Preview...</div>
            </div>
          }>
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }} shadows={knittingHighFidelityMode}>
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
          Drag to rotate • Scroll to zoom • Hover on chart to highlight stitch
        </p>
      </motion.div>
    </motion.div>
  );
}
