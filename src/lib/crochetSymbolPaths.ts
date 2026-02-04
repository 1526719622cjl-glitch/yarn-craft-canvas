/**
 * JIS Standard Crochet Symbol SVG Paths
 * Accurate representations based on Japanese crochet charting conventions
 */

import { CrochetStitchType } from './crochetStitchTypes';

export interface SymbolPath {
  path: string;
  viewBox: string;
  filled?: boolean;
  strokeWidth?: number;
  // For composite symbols
  secondaryPath?: string;
  secondaryFilled?: boolean;
}

// Complete symbol path definitions
export const SYMBOL_PATHS: Record<CrochetStitchType, SymbolPath> = {
  // ===== Basic Stitches =====
  
  // Chain - Oval/ellipse
  chain: {
    path: 'M 12,12 m -8,0 a 8,4 0 1,0 16,0 a 8,4 0 1,0 -16,0',
    viewBox: '0 0 24 24',
  },
  
  // Slip stitch - Filled dot
  slip: {
    path: 'M 12,12 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0',
    viewBox: '0 0 24 24',
    filled: true,
  },
  
  // Single crochet - X mark
  sc: {
    path: 'M 6,6 L 18,18 M 18,6 L 6,18',
    viewBox: '0 0 24 24',
  },
  
  // Half double crochet - T shape
  hdc: {
    path: 'M 12,4 L 12,20 M 6,4 L 18,4',
    viewBox: '0 0 24 24',
  },
  
  // Double crochet - T with diagonal
  dc: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9',
    viewBox: '0 0 24 24',
  },
  
  // Treble crochet - T with 2 diagonals
  tr: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,9 L 16,7 M 8,14 L 16,12',
    viewBox: '0 0 24 24',
  },
  
  // Double treble - T with 3 diagonals
  dtr: {
    path: 'M 12,1 L 12,23 M 6,1 L 18,1 M 8,7 L 16,5 M 8,12 L 16,10 M 8,17 L 16,15',
    viewBox: '0 0 24 24',
  },
  
  // Triple treble - T with 4 diagonals
  trtr: {
    path: 'M 12,1 L 12,23 M 6,1 L 18,1 M 8,5 L 16,4 M 8,9 L 16,8 M 8,13 L 16,12 M 8,17 L 16,16',
    viewBox: '0 0 24 24',
  },
  
  // Quadruple treble - T with 5 diagonals
  qtr: {
    path: 'M 12,1 L 12,23 M 6,1 L 18,1 M 8,4 L 16,3 M 8,7.5 L 16,6.5 M 8,11 L 16,10 M 8,14.5 L 16,13.5 M 8,18 L 16,17',
    viewBox: '0 0 24 24',
  },
  
  // ===== Increase Stitches =====
  
  // Increase (V shape)
  inc: {
    path: 'M 12,20 L 4,4 M 12,20 L 20,4',
    viewBox: '0 0 24 24',
  },
  
  // 3-stitch increase (W shape)
  inc3: {
    path: 'M 4,4 L 8,20 L 12,4 L 16,20 L 20,4',
    viewBox: '0 0 24 24',
  },
  
  // 4-stitch increase
  inc4: {
    path: 'M 12,20 L 2,4 M 12,20 L 8,4 M 12,20 L 16,4 M 12,20 L 22,4',
    viewBox: '0 0 24 24',
  },
  
  // 5-stitch increase (fan base)
  inc5: {
    path: 'M 12,22 L 2,4 M 12,22 L 6,4 M 12,22 L 12,4 M 12,22 L 18,4 M 12,22 L 22,4',
    viewBox: '0 0 24 24',
  },
  
  // ===== Decrease Stitches =====
  
  // Decrease (inverted V / A shape)
  dec: {
    path: 'M 4,20 L 12,4 M 20,20 L 12,4',
    viewBox: '0 0 24 24',
  },
  
  // 3-stitch decrease (M shape)
  dec3: {
    path: 'M 4,20 L 8,4 L 12,20 L 16,4 L 20,20',
    viewBox: '0 0 24 24',
  },
  
  // SC 2 together
  sc2tog: {
    path: 'M 4,20 L 12,4 L 20,20 M 8,10 L 16,10',
    viewBox: '0 0 24 24',
  },
  
  // DC 2 together
  dc2tog: {
    path: 'M 4,22 L 12,2 L 20,22 M 6,2 L 18,2 M 8,10 L 16,10',
    viewBox: '0 0 24 24',
  },
  
  // DC 3 together
  dc3tog: {
    path: 'M 2,22 L 12,2 L 22,22 M 7,22 L 12,2 M 17,22 L 12,2 M 6,2 L 18,2',
    viewBox: '0 0 24 24',
  },
  
  // DC 4 together
  dc4tog: {
    path: 'M 2,22 L 12,2 L 22,22 M 5,22 L 12,2 M 12,22 L 12,2 M 19,22 L 12,2 M 6,2 L 18,2',
    viewBox: '0 0 24 24',
  },
  
  // DC 5 together
  dc5tog: {
    path: 'M 2,22 L 12,2 L 22,22 M 5,22 L 12,2 M 8.5,22 L 12,2 M 15.5,22 L 12,2 M 19,22 L 12,2 M 6,2 L 18,2',
    viewBox: '0 0 24 24',
  },
  
  // ===== Loop Variations =====
  
  // Back loop only - X with bottom dash
  blo: {
    path: 'M 6,16 L 18,4 M 6,4 L 18,16',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 4,22 L 20,22',
  },
  
  // Front loop only - X with top dash
  flo: {
    path: 'M 6,18 L 18,6 M 6,6 L 18,18',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 4,2 L 20,2',
  },
  
  // Back post SC
  bpsc: {
    path: 'M 6,6 L 18,18 M 18,6 L 6,18',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 10,20 Q 6,20 6,16',
  },
  
  // Front post SC
  fpsc: {
    path: 'M 6,6 L 18,18 M 18,6 L 6,18',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 14,20 Q 18,20 18,16',
  },
  
  // Back post DC
  bpdc: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 10,20 Q 6,20 6,16',
  },
  
  // Front post DC
  fpdc: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 14,20 Q 18,20 18,16',
  },
  
  // Back post TR
  bptr: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,9 L 16,7 M 8,14 L 16,12',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 10,20 Q 6,20 6,16',
  },
  
  // Front post TR
  fptr: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,9 L 16,7 M 8,14 L 16,12',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 14,20 Q 18,20 18,16',
  },
  
  // ===== Texture Stitches =====
  
  // Popcorn - Circle outline
  popcorn: {
    path: 'M 12,12 m -8,0 a 8,8 0 1,0 16,0 a 8,8 0 1,0 -16,0',
    viewBox: '0 0 24 24',
  },
  
  // Bobble - Filled oval
  bobble: {
    path: 'M 12,4 Q 4,4 4,12 Q 4,20 12,20 Q 20,20 20,12 Q 20,4 12,4',
    viewBox: '0 0 24 24',
    filled: true,
  },
  
  // Puff - Horizontal oval with vertical line
  puff: {
    path: 'M 4,12 Q 4,6 12,6 Q 20,6 20,12 Q 20,18 12,18 Q 4,18 4,12 M 12,6 L 12,18',
    viewBox: '0 0 24 24',
  },
  
  // Bullion - Zigzag/coil pattern
  bullion: {
    path: 'M 12,2 L 12,22 M 8,4 L 16,4 M 8,8 L 16,6 M 8,12 L 16,10 M 8,16 L 16,14 M 8,20 L 16,18',
    viewBox: '0 0 24 24',
  },
  
  // Cluster - Multiple lines joining at top
  cluster: {
    path: 'M 12,2 L 4,22 M 12,2 L 12,22 M 12,2 L 20,22 M 7,2 L 17,2',
    viewBox: '0 0 24 24',
  },
  
  // Shell - Fan shape from bottom
  shell: {
    path: 'M 12,22 L 2,6 M 12,22 L 7,6 M 12,22 L 12,6 M 12,22 L 17,6 M 12,22 L 22,6 M 2,6 Q 12,2 22,6',
    viewBox: '0 0 24 24',
  },
  
  // Fan - Open fan shape
  fan: {
    path: 'M 12,20 C 4,12 4,6 6,4 M 12,20 C 8,12 8,6 10,4 M 12,20 L 12,4 M 12,20 C 16,12 16,6 14,4 M 12,20 C 20,12 20,6 18,4',
    viewBox: '0 0 24 24',
  },
  
  // Picot - Small loop
  picot: {
    path: 'M 8,18 L 8,12 Q 8,6 12,6 Q 16,6 16,12 L 16,18',
    viewBox: '0 0 24 24',
  },
  
  // Spike - Long X extending down
  spike: {
    path: 'M 6,6 L 18,18 M 18,6 L 6,18 M 12,18 L 12,24',
    viewBox: '0 0 24 28',
  },
  
  // Loop stitch - Curly loops
  loop: {
    path: 'M 4,18 Q 4,8 8,8 Q 12,8 12,14 Q 12,8 16,8 Q 20,8 20,18',
    viewBox: '0 0 24 24',
  },
  
  // Crocodile - Scale pattern
  crocodile: {
    path: 'M 2,20 Q 2,10 12,10 Q 22,10 22,20 M 7,20 Q 7,14 12,14 Q 17,14 17,20 M 12,10 L 12,2',
    viewBox: '0 0 24 24',
  },
  
  // ===== Special Stitches =====
  
  // Magic ring - Double circle
  magic: {
    path: 'M 12,12 m -9,0 a 9,9 0 1,0 18,0 a 9,9 0 1,0 -18,0 M 12,12 m -4,0 a 4,4 0 1,0 8,0 a 4,4 0 1,0 -8,0',
    viewBox: '0 0 24 24',
  },
  
  // Standing stitch - T with dot at base
  standing: {
    path: 'M 12,4 L 12,18 M 6,4 L 18,4',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 12,20 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
    secondaryFilled: true,
  },
  
  // Join - Connected dots
  join: {
    path: 'M 6,12 L 18,12',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 4,12 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M 20,12 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
    secondaryFilled: true,
  },
  
  // Skip - Empty space with dots
  skip: {
    path: 'M 6,12 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M 12,12 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0 M 18,12 m -2,0 a 2,2 0 1,0 4,0 a 2,2 0 1,0 -4,0',
    viewBox: '0 0 24 24',
  },
  
  // Space - Dashed arc
  space: {
    path: 'M 4,16 Q 12,4 20,16',
    viewBox: '0 0 24 24',
    strokeWidth: 1.5,
  },
  
  // Linked stitch - Interlocked rings
  linked: {
    path: 'M 12,2 L 12,22 M 6,2 L 18,2 M 8,11 L 16,9 M 8,18 L 16,18',
    viewBox: '0 0 24 24',
  },
  
  // Extended stitch - T with middle chain
  extended: {
    path: 'M 12,4 L 12,20 M 6,4 L 18,4',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 12,12 m -2,0 a 2,1 0 1,0 4,0 a 2,1 0 1,0 -4,0',
  },
  
  // Crossed stitch - Overlapping Xs
  crossed: {
    path: 'M 4,22 L 12,2 L 20,22 M 20,2 L 12,22 L 4,2',
    viewBox: '0 0 24 24',
  },
  
  // ===== Decorative Stitches =====
  
  // V-stitch
  vst: {
    path: 'M 12,20 L 4,4 M 12,20 L 20,4 M 4,4 L 4,2 L 20,2 L 20,4',
    viewBox: '0 0 24 24',
  },
  
  // Granny stitch - 3 vertical lines joined
  granny: {
    path: 'M 6,4 L 6,20 M 12,4 L 12,20 M 18,4 L 18,20 M 6,4 L 18,4',
    viewBox: '0 0 24 24',
  },
  
  // Bead stitch - Circle with X
  bead: {
    path: 'M 12,12 m -6,0 a 6,6 0 1,0 12,0 a 6,6 0 1,0 -12,0',
    viewBox: '0 0 24 24',
    secondaryPath: 'M 9,9 L 15,15 M 15,9 L 9,15',
  },
  
  // Solomon's knot - Elongated chain
  solomon: {
    path: 'M 4,12 Q 4,4 12,4 Q 20,4 20,12 Q 20,20 12,20 Q 4,20 4,12 M 8,8 L 16,16',
    viewBox: '0 0 24 24',
  },
  
  // Broomstick lace - Large loop
  broomstick: {
    path: 'M 4,20 L 4,8 Q 4,4 12,4 Q 20,4 20,8 L 20,20',
    viewBox: '0 0 24 24',
  },
  
  // Hairpin lace - Parallel loops
  hairpin: {
    path: 'M 4,4 L 4,20 M 20,4 L 20,20 M 4,8 Q 12,6 20,8 M 4,14 Q 12,12 20,14 M 4,20 Q 12,18 20,20',
    viewBox: '0 0 24 24',
  },
};

// Get symbol path for a stitch type
export function getSymbolPath(type: CrochetStitchType): SymbolPath {
  return SYMBOL_PATHS[type] || SYMBOL_PATHS.sc;
}
