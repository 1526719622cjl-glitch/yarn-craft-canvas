import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Flexible swatch data for gauge calculations - dual dimension system
export interface SwatchData {
  // Pre-wash swatch (independent dimensions - no restrictions)
  preWashWidth: number;      // cm
  preWashHeight: number;     // cm
  stitchesPreWash: number;
  rowsPreWash: number;
  
  // Post-wash swatch (same swatch after washing)
  postWashWidth: number;     // cm
  postWashHeight: number;    // cm
  stitchesPostWash: number;
  rowsPostWash: number;
}

// Calculated gauge values
export interface GaugeData {
  // Pre-wash gauge (raw swatch)
  preWashStitchDensity: number; // stitches per cm
  preWashRowDensity: number; // rows per cm
  // Post-wash gauge (after blocking)
  postWashStitchDensity: number; // stitches per cm
  postWashRowDensity: number; // rows per cm
  gaugeRatio: number; // stitch width / row height (post-wash)
  // Shrinkage/expansion percentages
  widthShrinkage: number; // % change (positive = shrinkage, negative = growth)
  heightShrinkage: number; // % change
  // Compensation factors
  widthFactor: number; // pre/post multiplier
  heightFactor: number; // pre/post multiplier
}

// Saved yarn record
export interface YarnRecord {
  id: string;
  name: string;
  swatchData: SwatchData;
  gaugeData: GaugeData;
  createdAt: number;
}

// Project planning
export interface ProjectPlan {
  targetWidth: number; // cm
  targetHeight: number; // cm
  startingStitches: number;
  startingRows: number;
}

// Pixel grid cell
export interface PixelCell {
  x: number;
  y: number;
  color: string;
}

// Pixel editor tool
export type PixelTool = 'pencil' | 'eraser' | 'bucket' | 'eyedropper';

// Crochet stitch types (Complete JIS standard)
export type CrochetStitch = 
  | 'chain'    // CH - 鎖編み
  | 'slip'     // SL - 引き抜き編み
  | 'sc'       // X - 細編み (single crochet)
  | 'hdc'      // T - 中長編み (half double crochet)
  | 'dc'       // F - 長編み (double crochet)
  | 'tr'       // E - 長々編み (treble crochet)
  | 'dtr'      // W - 三つ巻き長編み (double treble)
  | 'inc'      // V - 増し目 (increase)
  | 'dec'      // A - 減らし目 (decrease/inverted V)
  | 'magic'    // Magic ring
  | 'blo'      // Back loop only
  | 'flo'      // Front loop only
  | 'spike'    // Spike stitch
  | 'popcorn'  // Popcorn stitch
  | 'bobble'   // Bobble stitch
  | 'puff';    // Puff stitch

// Knitting stitch types
export type KnittingStitch = 
  | 'knit' // K
  | 'purl' // P
  | 'yo' // yarn over
  | 'k2tog' // knit 2 together
  | 'ssk' // slip slip knit
  | 'cable4f' // cable 4 front
  | 'cable4b' // cable 4 back
  | 'empty';

// Crochet chart cell
export interface CrochetCell {
  row: number;
  stitch: number;
  type: CrochetStitch;
}

// Knitting chart cell
export interface KnittingCell {
  row: number;
  stitch: number;
  type: KnittingStitch;
}

interface YarnCluesStore {
  // Swatch Lab
  swatchData: SwatchData;
  gaugeData: GaugeData;
  projectPlan: ProjectPlan;
  yarnLibrary: YarnRecord[];
  setSwatchData: (data: Partial<SwatchData>) => void;
  calculateGauge: () => void;
  setProjectPlan: (plan: Partial<ProjectPlan>) => void;
  calculateProjectStitches: () => void;
  saveToYarnLibrary: (name: string) => void;
  loadFromYarnLibrary: (id: string) => void;
  deleteFromYarnLibrary: (id: string) => void;

  // Pixel Generator
  pixelGrid: PixelCell[];
  gridWidth: number;
  gridHeight: number;
  colorPalette: string[];
  selectedTool: PixelTool;
  selectedColor: string;
  customGridWidth: number;
  customGridHeight: number;
  setPixelGrid: (grid: PixelCell[]) => void;
  setGridDimensions: (width: number, height: number) => void;
  setColorPalette: (colors: string[]) => void;
  setSelectedTool: (tool: PixelTool) => void;
  setSelectedColor: (color: string) => void;
  setCustomGridDimensions: (width: number, height: number) => void;
  paintPixel: (x: number, y: number, color: string) => void;
  erasePixel: (x: number, y: number) => void;
  bucketFill: (x: number, y: number, newColor: string) => void;

  // Crochet Engine
  crochetChart: CrochetCell[];
  crochetInput: string;
  chartMode: 'circular' | 'linear';
  hoveredCrochetCell: { row: number; stitch: number } | null;
  highFidelityMode: boolean;
  setCrochetChart: (chart: CrochetCell[]) => void;
  setCrochetInput: (input: string) => void;
  setChartMode: (mode: 'circular' | 'linear') => void;
  setHoveredCrochetCell: (cell: { row: number; stitch: number } | null) => void;
  setHighFidelityMode: (enabled: boolean) => void;
  parseCrochetPattern: () => void;

  // Knitting Engine
  knittingChart: KnittingCell[];
  knittingWidth: number;
  knittingHeight: number;
  selectedKnittingStitch: KnittingStitch;
  showWrongSide: boolean;
  hoveredKnittingCell: { row: number; stitch: number } | null;
  knittingHighFidelityMode: boolean;
  setKnittingChart: (chart: KnittingCell[]) => void;
  setKnittingDimensions: (width: number, height: number) => void;
  setSelectedKnittingStitch: (stitch: KnittingStitch) => void;
  setShowWrongSide: (show: boolean) => void;
  setHoveredKnittingCell: (cell: { row: number; stitch: number } | null) => void;
  setKnittingHighFidelityMode: (enabled: boolean) => void;
  paintKnittingCell: (row: number, stitch: number) => void;
  initKnittingGrid: () => void;
  getWrongSideInstructions: () => string[];
}

export const useYarnCluesStore = create<YarnCluesStore>()(
  persist(
    (set, get) => ({
      // Initial Swatch Data - dual dimension system
      swatchData: {
        preWashWidth: 10,
        preWashHeight: 10,
        stitchesPreWash: 20,
        rowsPreWash: 28,
        postWashWidth: 10,
        postWashHeight: 10,
        stitchesPostWash: 20,
        rowsPostWash: 28,
      },
      gaugeData: {
        preWashStitchDensity: 2,
        preWashRowDensity: 2.8,
        postWashStitchDensity: 2,
        postWashRowDensity: 2.8,
        gaugeRatio: 0.714,
        widthShrinkage: 0,
        heightShrinkage: 0,
        widthFactor: 1,
        heightFactor: 1,
      },
      projectPlan: {
        targetWidth: 50,
        targetHeight: 60,
        startingStitches: 100,
        startingRows: 168,
      },
      yarnLibrary: [],

      setSwatchData: (data) => {
        set((state) => ({
          swatchData: { ...state.swatchData, ...data },
        }));
        get().calculateGauge();
      },

      calculateGauge: () => {
        const { swatchData } = get();
        
        // Pre-wash gauge (raw measurements)
        const preWashStitchDensity = swatchData.preWashWidth > 0 
          ? swatchData.stitchesPreWash / swatchData.preWashWidth 
          : 0;
        const preWashRowDensity = swatchData.preWashHeight > 0 
          ? swatchData.rowsPreWash / swatchData.preWashHeight 
          : 0;
        
        // Post-wash gauge (after blocking)
        const postWashStitchDensity = swatchData.postWashWidth > 0 
          ? swatchData.stitchesPostWash / swatchData.postWashWidth 
          : 0;
        const postWashRowDensity = swatchData.postWashHeight > 0 
          ? swatchData.rowsPostWash / swatchData.postWashHeight 
          : 0;
        
        // Gauge ratio (post-wash, for aspect ratio)
        const gaugeRatio = postWashStitchDensity > 0 && postWashRowDensity > 0
          ? (1 / postWashStitchDensity) / (1 / postWashRowDensity)
          : 1;
        
        // Dimensional shrinkage/expansion (comparing swatch sizes, not stitch counts)
        const widthShrinkage = swatchData.preWashWidth > 0
          ? ((swatchData.preWashWidth - swatchData.postWashWidth) / swatchData.preWashWidth) * 100
          : 0;
        const heightShrinkage = swatchData.preWashHeight > 0
          ? ((swatchData.preWashHeight - swatchData.postWashHeight) / swatchData.preWashHeight) * 100
          : 0;
        
        // Compensation factors (how much to scale cast-on)
        const widthFactor = swatchData.postWashWidth > 0 
          ? swatchData.preWashWidth / swatchData.postWashWidth 
          : 1;
        const heightFactor = swatchData.postWashHeight > 0 
          ? swatchData.preWashHeight / swatchData.postWashHeight 
          : 1;

        set({
          gaugeData: {
            preWashStitchDensity,
            preWashRowDensity,
            postWashStitchDensity,
            postWashRowDensity,
            gaugeRatio,
            widthShrinkage,
            heightShrinkage,
            widthFactor,
            heightFactor,
          },
        });
        get().calculateProjectStitches();
      },

      setProjectPlan: (plan) => {
        set((state) => ({
          projectPlan: { ...state.projectPlan, ...plan },
        }));
        get().calculateProjectStitches();
      },

      calculateProjectStitches: () => {
        const { gaugeData, projectPlan } = get();
        // Use post-wash density for accurate final-size targeting
        const startingStitches = Math.round(projectPlan.targetWidth * gaugeData.postWashStitchDensity);
        const startingRows = Math.round(projectPlan.targetHeight * gaugeData.postWashRowDensity);
        set((state) => ({
          projectPlan: { ...state.projectPlan, startingStitches, startingRows },
        }));
      },

      saveToYarnLibrary: (name: string) => {
        const { swatchData, gaugeData, yarnLibrary } = get();
        const newRecord: YarnRecord = {
          id: crypto.randomUUID(),
          name,
          swatchData: { ...swatchData },
          gaugeData: { ...gaugeData },
          createdAt: Date.now(),
        };
        set({ yarnLibrary: [...yarnLibrary, newRecord] });
      },

      loadFromYarnLibrary: (id: string) => {
        const { yarnLibrary } = get();
        const record = yarnLibrary.find(r => r.id === id);
        if (record) {
          set({
            swatchData: { ...record.swatchData },
            gaugeData: { ...record.gaugeData },
          });
        }
      },

      deleteFromYarnLibrary: (id: string) => {
        const { yarnLibrary } = get();
        set({ yarnLibrary: yarnLibrary.filter(r => r.id !== id) });
      },

      // Pixel Generator
      pixelGrid: [],
      gridWidth: 20,
      gridHeight: 20,
      colorPalette: ['#FDFBF7', '#E8D5C4', '#C9A08E', '#8B9A7C', '#D4A5A5', '#7B8FA1'],
      selectedTool: 'pencil',
      selectedColor: '#C9A08E',
      customGridWidth: 60,
      customGridHeight: 40,

      setPixelGrid: (grid) => set({ pixelGrid: grid }),
      setGridDimensions: (width, height) => set({ gridWidth: width, gridHeight: height }),
      setColorPalette: (colors) => set({ colorPalette: colors }),
      setSelectedTool: (tool) => set({ selectedTool: tool }),
      setSelectedColor: (color) => set({ selectedColor: color }),
      setCustomGridDimensions: (width, height) => set({ customGridWidth: width, customGridHeight: height }),
      
      paintPixel: (x, y, color) => {
        const { pixelGrid, gridWidth, gridHeight } = get();
        const idx = pixelGrid.findIndex(p => p.x === x && p.y === y);
        if (idx >= 0) {
          const newGrid = [...pixelGrid];
          newGrid[idx] = { ...newGrid[idx], color };
          set({ pixelGrid: newGrid });
        }
      },

      erasePixel: (x, y) => {
        const { pixelGrid, colorPalette } = get();
        const defaultColor = colorPalette[0] || '#FDFBF7';
        const idx = pixelGrid.findIndex(p => p.x === x && p.y === y);
        if (idx >= 0) {
          const newGrid = [...pixelGrid];
          newGrid[idx] = { ...newGrid[idx], color: defaultColor };
          set({ pixelGrid: newGrid });
        }
      },

      bucketFill: (x, y, newColor) => {
        const { pixelGrid, gridWidth, gridHeight } = get();
        const targetCell = pixelGrid.find(p => p.x === x && p.y === y);
        if (!targetCell || targetCell.color === newColor) return;

        const targetColor = targetCell.color;
        const newGrid = [...pixelGrid];
        const visited = new Set<string>();
        const stack: [number, number][] = [[x, y]];

        while (stack.length > 0) {
          const [cx, cy] = stack.pop()!;
          const key = `${cx},${cy}`;
          if (visited.has(key)) continue;
          if (cx < 0 || cx >= gridWidth || cy < 0 || cy >= gridHeight) continue;
          
          const cellIdx = newGrid.findIndex(p => p.x === cx && p.y === cy);
          if (cellIdx < 0 || newGrid[cellIdx].color !== targetColor) continue;

          visited.add(key);
          newGrid[cellIdx] = { ...newGrid[cellIdx], color: newColor };
          
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }

        set({ pixelGrid: newGrid });
      },

      // Crochet Engine
      crochetChart: [],
      crochetInput: '6x\n(2x, v)*6\n(3x, v)*6',
      chartMode: 'circular',
      hoveredCrochetCell: null,
      highFidelityMode: false,

      setCrochetChart: (chart) => set({ crochetChart: chart }),
      setCrochetInput: (input) => set({ crochetInput: input }),
      setChartMode: (mode) => set({ chartMode: mode }),
      setHoveredCrochetCell: (cell) => set({ hoveredCrochetCell: cell }),
      setHighFidelityMode: (enabled) => set({ highFidelityMode: enabled }),

      parseCrochetPattern: () => {
        const { crochetInput } = get();
        const chart: CrochetCell[] = [];
        const lines = crochetInput.split('\n').filter(l => l.trim());
        
        let currentRow = 0;
        
        lines.forEach((line) => {
          const trimmed = line.trim().toLowerCase();
          currentRow++;
          
          // Parse patterns like "6x" (6 single crochet)
          const simpleMatch = trimmed.match(/^(\d+)([xvotfewaslchbp])$/);
          if (simpleMatch) {
            const count = parseInt(simpleMatch[1]);
            const typeChar = simpleMatch[2];
            const type = charToStitchType(typeChar);
            for (let i = 0; i < count; i++) {
              chart.push({ row: currentRow, stitch: i + 1, type });
            }
            return;
          }

          // Parse patterns like "(2x, v)*6"
          const repeatMatch = trimmed.match(/^\(([^)]+)\)\*(\d+)$/);
          if (repeatMatch) {
            const pattern = repeatMatch[1];
            const repeats = parseInt(repeatMatch[2]);
            const stitches: CrochetStitch[] = [];
            
            const parts = pattern.split(',').map(p => p.trim());
            parts.forEach(part => {
              const partMatch = part.match(/^(\d*)([xvotfewaslchbp])$/);
              if (partMatch) {
                const count = partMatch[1] ? parseInt(partMatch[1]) : 1;
                const typeChar = partMatch[2];
                const type = charToStitchType(typeChar);
                for (let i = 0; i < count; i++) {
                  stitches.push(type);
                }
              }
            });

            let stitchNum = 1;
            for (let r = 0; r < repeats; r++) {
              stitches.forEach(type => {
                chart.push({ row: currentRow, stitch: stitchNum++, type });
              });
            }
          }
        });

        set({ crochetChart: chart });
      },

      // Knitting Engine
      knittingChart: [],
      knittingWidth: 20,
      knittingHeight: 10,
      selectedKnittingStitch: 'knit',
      showWrongSide: false,
      hoveredKnittingCell: null,
      knittingHighFidelityMode: false,

      setKnittingChart: (chart) => set({ knittingChart: chart }),
      setKnittingDimensions: (width, height) => {
        set({ knittingWidth: width, knittingHeight: height });
        get().initKnittingGrid();
      },
      setSelectedKnittingStitch: (stitch) => set({ selectedKnittingStitch: stitch }),
      setShowWrongSide: (show) => set({ showWrongSide: show }),
      setHoveredKnittingCell: (cell) => set({ hoveredKnittingCell: cell }),
      setKnittingHighFidelityMode: (enabled) => set({ knittingHighFidelityMode: enabled }),

      initKnittingGrid: () => {
        const { knittingWidth, knittingHeight } = get();
        const chart: KnittingCell[] = [];
        for (let row = 0; row < knittingHeight; row++) {
          for (let stitch = 0; stitch < knittingWidth; stitch++) {
            chart.push({ row, stitch, type: 'knit' });
          }
        }
        set({ knittingChart: chart });
      },

      paintKnittingCell: (row, stitch) => {
        const { knittingChart, selectedKnittingStitch } = get();
        const newChart = knittingChart.map(cell => 
          cell.row === row && cell.stitch === stitch 
            ? { ...cell, type: selectedKnittingStitch }
            : cell
        );
        set({ knittingChart: newChart });
      },

      getWrongSideInstructions: () => {
        const { knittingChart, knittingWidth, knittingHeight } = get();
        const instructions: string[] = [];

        for (let row = 0; row < knittingHeight; row++) {
          const isWrongSideRow = row % 2 === 1;
          const rowCells = knittingChart.filter(c => c.row === row);
          
          // On WS, work from right to left (reversed)
          const orderedCells = isWrongSideRow ? [...rowCells].reverse() : rowCells;
          
          const stitchNames = orderedCells.map(cell => {
            if (isWrongSideRow) {
              // Flip stitches for wrong side
              switch (cell.type) {
                case 'knit': return 'P';
                case 'purl': return 'K';
                case 'yo': return 'YO';
                case 'k2tog': return 'P2tog';
                case 'ssk': return 'SSP';
                default: return cell.type.toUpperCase();
              }
            }
            return cell.type === 'knit' ? 'K' : cell.type === 'purl' ? 'P' : cell.type.toUpperCase();
          });

          const rowLabel = isWrongSideRow ? `Row ${row + 1} (WS)` : `Row ${row + 1} (RS)`;
          instructions.push(`${rowLabel}: ${stitchNames.join(', ')}`);
        }

        return instructions;
      },
    }),
    {
      name: 'yarn-clues-storage',
      partialize: (state) => ({
        swatchData: state.swatchData,
        gaugeData: state.gaugeData,
        projectPlan: state.projectPlan,
        colorPalette: state.colorPalette,
        yarnLibrary: state.yarnLibrary,
        customGridWidth: state.customGridWidth,
        customGridHeight: state.customGridHeight,
      }),
    }
  )
);

// Helper function for stitch type mapping
function charToStitchType(char: string): CrochetStitch {
  const mapping: Record<string, CrochetStitch> = {
    'x': 'sc',
    'v': 'inc',
    'a': 'dec',
    't': 'hdc',
    'f': 'dc',
    'e': 'tr',
    'w': 'dtr',
    'o': 'dc', // legacy support
    'ch': 'chain',
    'c': 'chain',
    'sl': 'slip',
    's': 'slip',
    'b': 'bobble',
    'p': 'puff',
  };
  return mapping[char] || 'sc';
}
