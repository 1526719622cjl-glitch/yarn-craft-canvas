import { motion } from 'framer-motion';
import { useYarnCluesStore, CrochetStitch } from '@/store/useYarnCluesStore';
import { Eye, LayoutGrid, ZoomIn, Sparkles, AlertCircle, CheckCircle, Loader2, Brain, Split, Palette } from 'lucide-react';
import { CrochetHookIcon } from '@/components/icons';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { parseCrochetPattern, toStoreFormat, ParseResult, getUsedStitchTypes } from '@/lib/enhancedCrochetParser';
import { InstancedCrochetScene } from '@/components/3d/InstancedYarnSimulation';
import { StitchSymbol, getStitchDisplayName } from '@/components/crochet/CrochetSymbols';
import { EnhancedCrochetSymbol, StitchCategoryTabs, SymbolLegend } from '@/components/crochet/EnhancedCrochetSymbol';
import { CrochetStitchType, STITCH_DATABASE, getStitchesByCategory } from '@/lib/crochetStitchTypes';
import { useAIPatternParser } from '@/hooks/useAIPatternParser';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

// 3D Preview Scene with TubeGeometry yarn
function Crochet3DScene({ 
  chart, 
  highFidelity 
}: { 
  chart: { row: number; stitch: number; type: CrochetStitch }[];
  highFidelity: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow={highFidelity} />
      <pointLight position={[-5, 5, -5]} intensity={0.3} />
      
      {highFidelity && <Environment preset="apartment" />}
      
      <InstancedCrochetScene chart={chart} highFidelity={highFidelity} />
      
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

  const [useAIParser, setUseAIParser] = useState(false);
  const [selectedStitchIndex, setSelectedStitchIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');
  const [showSymbolGuide, setShowSymbolGuide] = useState(false);
  const { parsePatternDebounced, isLoading: aiLoading, error: aiError } = useAIPatternParser();

  // Parse pattern with local recursive parser
  const parseResult: ParseResult = useMemo(() => {
    return parseCrochetPattern(crochetInput);
  }, [crochetInput]);

  // Update store when parse result changes (local parser)
  useEffect(() => {
    if (!useAIParser) {
      const storeFormat = toStoreFormat(parseResult.stitches);
      setCrochetChart(storeFormat);
    }
  }, [parseResult.stitches, setCrochetChart, useAIParser]);

  // AI parser with debounce
  const handleInputChange = useCallback((value: string) => {
    setCrochetInput(value);
    
    if (useAIParser && value.trim()) {
      parsePatternDebounced(value, (stitches) => {
        if (stitches.length > 0) {
          setCrochetChart(stitches);
        }
      });
    }
  }, [useAIParser, setCrochetInput, parsePatternDebounced, setCrochetChart]);

  // Group by rows
  const rowGroups = crochetChart.reduce((acc, cell) => {
    if (!acc[cell.row]) acc[cell.row] = [];
    acc[cell.row].push(cell);
    return acc;
  }, {} as Record<number, typeof crochetChart>);

  // Total stitch count
  const totalStitches = crochetChart.length;

  // Row validation with error highlighting
  const rowValidations = useMemo(() => {
    const validations: Record<number, { count: number; expected?: number; isValid: boolean; message?: string }> = {};
    let prevCount = 0;
    
    Object.entries(rowGroups).forEach(([rowStr, cells]) => {
      const row = parseInt(rowStr);
      const count = cells.length;
      const incCount = cells.filter(c => c.type === 'inc').length;
      const decCount = cells.filter(c => c.type === 'dec').length;
      
      let isValid = true;
      let message = '';
      
      if (row > 1 && prevCount > 0) {
        const expectedChange = incCount - decCount;
        const actualChange = count - prevCount;
        
        if (actualChange !== expectedChange && incCount + decCount > 0) {
          isValid = false;
          message = `Expected ${prevCount + expectedChange}, got ${count}`;
        }
      }
      
      validations[row] = { count, isValid, message };
      prevCount = count;
    });
    
    return validations;
  }, [rowGroups]);

  // Handle stitch click in chart (for bidirectional linking)
  const handleStitchClick = (row: number, stitch: number) => {
    const index = crochetChart.findIndex(c => c.row === row && c.stitch === stitch);
    setSelectedStitchIndex(index);
    // Could also scroll to text position here
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yarn-lavender/30 flex items-center justify-center">
              <CrochetHookIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-semibold text-foreground">Crochet Engine</h1>
              <p className="text-muted-foreground">AI-powered NLP parser with JIS charting & 3D yarn simulation</p>
            </div>
          </div>
          
          {/* AI Toggle */}
          <div className="flex items-center gap-3 frosted-panel px-4 py-2">
            <Brain className="w-4 h-4 text-primary" />
            <Label htmlFor="ai-toggle" className="text-sm font-medium">AI Parser</Label>
            <Switch
              id="ai-toggle"
              checked={useAIParser}
              onCheckedChange={setUseAIParser}
            />
            {aiLoading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
          </div>
        </div>
      </motion.div>

      {/* Split View Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left: Pattern Input */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Split className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Pattern Editor</h2>
            </div>
            {aiError && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {aiError}
              </span>
            )}
          </div>

          <Textarea
            value={crochetInput}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Enter pattern commands (e.g., 6x, (2x, v)*6)..."
            className="input-glass min-h-[200px] font-mono text-sm"
          />

          {/* Stitch Count Validator */}
          <div className="frosted-panel space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Stitch Count Validator</h3>
              <span className="text-xs text-muted-foreground">{totalStitches} total</span>
            </div>
            <div className="max-h-[150px] overflow-auto space-y-1">
              {parseResult.validations.map((v) => {
                const rowVal = rowValidations[v.row];
                const hasError = rowVal && !rowVal.isValid;
                
                return (
                  <div 
                    key={v.row} 
                    className={`flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition-all ${
                      hasError ? 'bg-destructive/10 ring-1 ring-destructive/30' : 'bg-muted/30'
                    }`}
                  >
                    <span className={`font-medium ${hasError ? 'text-destructive' : ''}`}>
                      Row {v.row}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{v.stitchCount} sts</span>
                      {v.message && (
                        <span className="text-muted-foreground">{v.message}</span>
                      )}
                      {hasError ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                          </TooltipTrigger>
                          <TooltipContent className="text-destructive">
                            {rowVal.message}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <CheckCircle className="w-3 h-3 text-secondary-foreground" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Syntax Guide with Categories */}
          <div className="frosted-panel space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">JIS Symbol Library</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSymbolGuide(!showSymbolGuide)}
                className="text-xs"
              >
                <Palette className="w-3 h-3 mr-1" />
                {showSymbolGuide ? 'Hide' : 'Expand'}
              </Button>
            </div>
            
            {showSymbolGuide ? (
              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                <TabsList className="grid grid-cols-4 lg:grid-cols-7 h-auto gap-1 bg-transparent">
                  <TabsTrigger value="basic" className="text-xs px-2 py-1">Basic</TabsTrigger>
                  <TabsTrigger value="increase" className="text-xs px-2 py-1">Inc</TabsTrigger>
                  <TabsTrigger value="decrease" className="text-xs px-2 py-1">Dec</TabsTrigger>
                  <TabsTrigger value="loop" className="text-xs px-2 py-1">Loop</TabsTrigger>
                  <TabsTrigger value="texture" className="text-xs px-2 py-1">Texture</TabsTrigger>
                  <TabsTrigger value="special" className="text-xs px-2 py-1">Special</TabsTrigger>
                  <TabsTrigger value="decorative" className="text-xs px-2 py-1">Deco</TabsTrigger>
                </TabsList>
                
                {['basic', 'increase', 'decrease', 'loop', 'texture', 'special', 'decorative'].map(cat => (
                  <TabsContent key={cat} value={cat} className="mt-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {getStitchesByCategory(cat as any).map(stitch => (
                        <div 
                          key={stitch.id}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          title={`${stitch.name} (${stitch.nameJP})`}
                        >
                          <EnhancedCrochetSymbol type={stitch.id} size={18} />
                          <div className="flex flex-col min-w-0">
                            <code className="text-[10px] font-mono text-primary truncate">{stitch.abbreviation}</code>
                            <span className="text-[9px] text-muted-foreground truncate">{stitch.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <StitchSymbol type="sc" size={16} />
                  <code className="bg-muted px-1 rounded">x</code> = SC
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="inc" size={16} />
                  <code className="bg-muted px-1 rounded">v</code> = Inc
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="dec" size={16} />
                  <code className="bg-muted px-1 rounded">a</code> = Dec
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="hdc" size={16} />
                  <code className="bg-muted px-1 rounded">t</code> = HDC
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="dc" size={16} />
                  <code className="bg-muted px-1 rounded">f</code> = DC
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="tr" size={16} />
                  <code className="bg-muted px-1 rounded">e</code> = TR
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="blo" size={16} />
                  <code className="bg-muted px-1 rounded">blo</code> = Back Loop
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="fpdc" size={16} />
                  <code className="bg-muted px-1 rounded">fpdc</code> = Front Post
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="popcorn" size={16} />
                  <code className="bg-muted px-1 rounded">pop</code> = Popcorn
                </div>
                <div className="flex items-center gap-2">
                  <StitchSymbol type="bobble" size={16} />
                  <code className="bg-muted px-1 rounded">bob</code> = Bobble
                </div>
                <div><code className="bg-muted px-1 rounded">(2x, v)*6</code> = repeat</div>
                <div><code className="bg-muted px-1 rounded">w</code> = 3-inc (fan)</div>
              </div>
            )}
            
            {/* Pattern Legend - shows stitches used in current pattern */}
            {parseResult.stitches.length > 0 && (
              <div className="pt-2 border-t border-border/50">
                <h4 className="text-xs font-medium mb-2 text-muted-foreground">Used in Pattern</h4>
                <SymbolLegend 
                  stitchTypes={getUsedStitchTypes(parseResult.stitches) as CrochetStitchType[]} 
                  size={16} 
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Right: Chart View */}
        <motion.div variants={itemVariants} className="glass-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-medium">Interactive Chart</h2>
            </div>
            <div className="flex gap-2">
              <Button
                variant={chartMode === 'circular' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('circular')}
                className="rounded-xl soft-press"
              >
                <CrochetHookIcon className="w-4 h-4 mr-1" />
                Rounds
              </Button>
              <Button
                variant={chartMode === 'linear' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setChartMode('linear')}
                className="rounded-xl soft-press"
              >
                <LayoutGrid className="w-4 h-4 mr-1" />
                Rows
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
                          const rowVal = rowValidations[row];
                          const hasError = rowVal && !rowVal.isValid;

                          return cells.map((cell, i) => {
                            const angle = i * angleStep - Math.PI / 2;
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;
                            const symbolRotation = angle + Math.PI / 2;
                            const isHovered = hoveredCrochetCell?.row === cell.row && hoveredCrochetCell?.stitch === cell.stitch;
                            const isSelected = selectedStitchIndex !== null && 
                              crochetChart[selectedStitchIndex]?.row === cell.row && 
                              crochetChart[selectedStitchIndex]?.stitch === cell.stitch;

                            return (
                              <motion.div
                                key={`${row}-${i}`}
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: (row * cells.length + i) * 0.01 }}
                                className={`absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center cursor-pointer transition-all ${
                                  isHovered || isSelected ? 'z-20 scale-125' : 'hover:scale-110'
                                } ${hasError ? 'text-destructive' : 'text-primary'}`}
                                style={{
                                  left: 200 + x,
                                  top: 200 + y,
                                }}
                                onMouseEnter={() => setHoveredCrochetCell({ row: cell.row, stitch: cell.stitch })}
                                onMouseLeave={() => setHoveredCrochetCell(null)}
                                onClick={() => handleStitchClick(cell.row, cell.stitch)}
                              >
                                <StitchSymbol 
                                  type={cell.type} 
                                  size={22} 
                                  rotation={symbolRotation}
                                  isSelected={isSelected}
                                  isHighlighted={isHovered}
                                />
                              </motion.div>
                            );
                          });
                        })}
                        {/* Center magic ring */}
                        <div 
                          className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center"
                          style={{ left: 200, top: 200 }}
                        >
                          <StitchSymbol type="magic" size={28} />
                        </div>
                        {/* Row labels with error indication */}
                        {Object.keys(rowGroups).map((rowNum) => {
                          const row = parseInt(rowNum);
                          const radius = 30 + row * 40 + 20;
                          const rowVal = rowValidations[row];
                          const hasError = rowVal && !rowVal.isValid;
                          
                          return (
                            <Tooltip key={`label-${row}`}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`absolute text-xs font-medium cursor-help ${
                                    hasError ? 'text-destructive' : 'text-muted-foreground'
                                  }`}
                                  style={{
                                    left: 200 + radius,
                                    top: 200 - 8,
                                  }}
                                >
                                  R{row}
                                  {hasError && <span className="ml-0.5">⚠</span>}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {rowVal?.count} stitches
                                {hasError && ` - ${rowVal?.message}`}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-auto">
                      {Object.entries(rowGroups).map(([rowNum, cells]) => {
                        const row = parseInt(rowNum);
                        const rowVal = rowValidations[row];
                        const hasError = rowVal && !rowVal.isValid;
                        
                        return (
                          <motion.div
                            key={rowNum}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: row * 0.05 }}
                            className={`flex items-center gap-2 ${hasError ? 'ring-1 ring-destructive/30 rounded-xl' : ''}`}
                          >
                            <span className={`w-12 text-xs font-medium ${hasError ? 'text-destructive' : 'text-muted-foreground'}`}>
                              R{rowNum}
                            </span>
                            <div className="flex flex-wrap gap-1 frosted-panel py-2 px-3 flex-1">
                              {cells.map((cell, i) => {
                                const isHovered = hoveredCrochetCell?.row === cell.row && hoveredCrochetCell?.stitch === cell.stitch;
                                const isSelected = selectedStitchIndex !== null && 
                                  crochetChart[selectedStitchIndex]?.row === cell.row && 
                                  crochetChart[selectedStitchIndex]?.stitch === cell.stitch;
                                
                                return (
                                  <Tooltip key={i}>
                                    <TooltipTrigger asChild>
                                      <div 
                                        className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-all ${
                                          isHovered || isSelected ? 'scale-125 z-10' : 'hover:scale-110'
                                        }`}
                                        onMouseEnter={() => setHoveredCrochetCell({ row: cell.row, stitch: cell.stitch })}
                                        onMouseLeave={() => setHoveredCrochetCell(null)}
                                        onClick={() => handleStitchClick(cell.row, cell.stitch)}
                                      >
                                        <StitchSymbol 
                                          type={cell.type} 
                                          size={18}
                                          isSelected={isSelected}
                                          isHighlighted={isHovered}
                                        />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {getStitchDisplayName(cell.type)}
                                    </TooltipContent>
                                  </Tooltip>
                                );
                              })}
                            </div>
                            <span className={`text-xs w-8 text-right ${hasError ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                              {cells.length}
                            </span>
                          </motion.div>
                        );
                      })}
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
                  <div className="w-full h-full flex items-center justify-center bg-muted/20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                }>
                  <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
                    <Crochet3DScene 
                      chart={crochetChart} 
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
