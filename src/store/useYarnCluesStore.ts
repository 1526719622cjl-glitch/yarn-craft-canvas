import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Swatch data for gauge calculations
export interface SwatchData {
  stitchesPreWash: number;
  rowsPreWash: number;
  stitchesPostWash: number;
  rowsPostWash: number;
}

// Calculated gauge values
export interface GaugeData {
  stitchDensity: number; // stitches per cm
  rowDensity: number; // rows per cm
  gaugeRatio: number; // stitch width / row height
  shrinkageStitches: number; // % change
  shrinkageRows: number; // % change
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

// Crochet stitch types (JIS standard)
export type CrochetStitch = 
  | 'chain' // 鎖編み - chain
  | 'slip' // 引き抜き編み - slip stitch
  | 'sc' // 細編み - single crochet (X)
  | 'hdc' // 中長編み - half double crochet
  | 'dc' // 長編み - double crochet (T)
  | 'tr' // 長々編み - treble crochet
  | 'inc' // 増し目 - increase (V)
  | 'dec' // 減らし目 - decrease
  | 'magic'; // magic ring

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
  setSwatchData: (data: Partial<SwatchData>) => void;
  calculateGauge: () => void;
  setProjectPlan: (plan: Partial<ProjectPlan>) => void;
  calculateProjectStitches: () => void;

  // Pixel Generator
  pixelGrid: PixelCell[];
  gridWidth: number;
  gridHeight: number;
  colorPalette: string[];
  setPixelGrid: (grid: PixelCell[]) => void;
  setGridDimensions: (width: number, height: number) => void;
  setColorPalette: (colors: string[]) => void;

  // Crochet Engine
  crochetChart: CrochetCell[];
  crochetInput: string;
  chartMode: 'circular' | 'linear';
  setCrochetChart: (chart: CrochetCell[]) => void;
  setCrochetInput: (input: string) => void;
  setChartMode: (mode: 'circular' | 'linear') => void;
  parseCrochetPattern: () => void;

  // Knitting Engine
  knittingChart: KnittingCell[];
  knittingWidth: number;
  knittingHeight: number;
  selectedKnittingStitch: KnittingStitch;
  showWrongSide: boolean;
  setKnittingChart: (chart: KnittingCell[]) => void;
  setKnittingDimensions: (width: number, height: number) => void;
  setSelectedKnittingStitch: (stitch: KnittingStitch) => void;
  setShowWrongSide: (show: boolean) => void;
  paintKnittingCell: (row: number, stitch: number) => void;
  initKnittingGrid: () => void;
  getWrongSideInstructions: () => string[];
}

const SWATCH_SIZE = 10; // 10cm x 10cm swatch

export const useYarnCluesStore = create<YarnCluesStore>()(
  persist(
    (set, get) => ({
      // Initial Swatch Data
      swatchData: {
        stitchesPreWash: 20,
        rowsPreWash: 28,
        stitchesPostWash: 20,
        rowsPostWash: 28,
      },
      gaugeData: {
        stitchDensity: 2,
        rowDensity: 2.8,
        gaugeRatio: 0.714,
        shrinkageStitches: 0,
        shrinkageRows: 0,
      },
      projectPlan: {
        targetWidth: 50,
        targetHeight: 60,
        startingStitches: 100,
        startingRows: 168,
      },

      setSwatchData: (data) => {
        set((state) => ({
          swatchData: { ...state.swatchData, ...data },
        }));
        get().calculateGauge();
      },

      calculateGauge: () => {
        const { swatchData } = get();
        const stitchDensity = swatchData.stitchesPostWash / SWATCH_SIZE;
        const rowDensity = swatchData.rowsPostWash / SWATCH_SIZE;
        const gaugeRatio = (SWATCH_SIZE / swatchData.stitchesPostWash) / (SWATCH_SIZE / swatchData.rowsPostWash);
        
        const shrinkageStitches = ((swatchData.stitchesPostWash - swatchData.stitchesPreWash) / swatchData.stitchesPreWash) * 100;
        const shrinkageRows = ((swatchData.rowsPostWash - swatchData.rowsPreWash) / swatchData.rowsPreWash) * 100;

        set({
          gaugeData: {
            stitchDensity,
            rowDensity,
            gaugeRatio,
            shrinkageStitches,
            shrinkageRows,
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
        const startingStitches = Math.round(projectPlan.targetWidth * gaugeData.stitchDensity);
        const startingRows = Math.round(projectPlan.targetHeight * gaugeData.rowDensity);
        set((state) => ({
          projectPlan: { ...state.projectPlan, startingStitches, startingRows },
        }));
      },

      // Pixel Generator
      pixelGrid: [],
      gridWidth: 20,
      gridHeight: 20,
      colorPalette: ['#FDFBF7', '#E8D5C4', '#C9A08E', '#8B9A7C', '#D4A5A5', '#7B8FA1'],

      setPixelGrid: (grid) => set({ pixelGrid: grid }),
      setGridDimensions: (width, height) => set({ gridWidth: width, gridHeight: height }),
      setColorPalette: (colors) => set({ colorPalette: colors }),

      // Crochet Engine
      crochetChart: [],
      crochetInput: '6x\n(2x, v)*6\n(3x, v)*6',
      chartMode: 'circular',

      setCrochetChart: (chart) => set({ crochetChart: chart }),
      setCrochetInput: (input) => set({ crochetInput: input }),
      setChartMode: (mode) => set({ chartMode: mode }),

      parseCrochetPattern: () => {
        const { crochetInput } = get();
        const chart: CrochetCell[] = [];
        const lines = crochetInput.split('\n').filter(l => l.trim());
        
        let currentRow = 0;
        
        lines.forEach((line) => {
          const trimmed = line.trim().toLowerCase();
          currentRow++;
          
          // Parse patterns like "6x" (6 single crochet)
          const simpleMatch = trimmed.match(/^(\d+)([xvo])$/);
          if (simpleMatch) {
            const count = parseInt(simpleMatch[1]);
            const type = simpleMatch[2] === 'x' ? 'sc' : simpleMatch[2] === 'v' ? 'inc' : 'dc';
            for (let i = 0; i < count; i++) {
              chart.push({ row: currentRow, stitch: i + 1, type: type as CrochetStitch });
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
              const partMatch = part.match(/^(\d*)([xvo])$/);
              if (partMatch) {
                const count = partMatch[1] ? parseInt(partMatch[1]) : 1;
                const type = partMatch[2] === 'x' ? 'sc' : partMatch[2] === 'v' ? 'inc' : 'dc';
                for (let i = 0; i < count; i++) {
                  stitches.push(type as CrochetStitch);
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

      setKnittingChart: (chart) => set({ knittingChart: chart }),
      setKnittingDimensions: (width, height) => {
        set({ knittingWidth: width, knittingHeight: height });
        get().initKnittingGrid();
      },
      setSelectedKnittingStitch: (stitch) => set({ selectedKnittingStitch: stitch }),
      setShowWrongSide: (show) => set({ showWrongSide: show }),

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
      }),
    }
  )
);
