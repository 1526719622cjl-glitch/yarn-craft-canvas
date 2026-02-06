/**
 * Crochet 3D Path Generator
 * Converts parsed crochet patterns to 3D wireframe vertices
 * Uses LineSegments with BufferGeometry for high-performance rendering
 */

import { CrochetStitchType } from './crochetStitchTypes';
import { ParsedStitch } from './enhancedCrochetParser';

// 3D spatial proportions per stitch type (from specification)
export const STITCH_3D_PROPS: Record<string, { height: number; width: number }> = {
  chain: { height: 0.5, width: 1.0 },
  ch: { height: 0.5, width: 1.0 },
  slip: { height: 0.3, width: 1.0 },
  sc: { height: 1.0, width: 1.0 },
  hdc: { height: 2.0, width: 1.0 },
  dc: { height: 3.0, width: 1.0 },
  tr: { height: 4.0, width: 1.0 },
  dtr: { height: 5.0, width: 1.0 },
  inc: { height: 1.0, width: 2.0 },
  dec: { height: 1.0, width: 0.5 },
  inc3: { height: 1.0, width: 3.0 },
  dec3: { height: 1.0, width: 0.33 },
  // Default for unlisted
  default: { height: 1.0, width: 1.0 },
};

// Configuration
export interface WireframeConfig {
  baseRadius: number;      // Starting radius for row 1
  rowSpacing: number;      // Radial distance between rows
  zIncrement: number;      // Z increment per stitch (spiral)
  heightScale: number;     // Multiplier for stitch heights
  showConnectors: boolean; // Show inter-stitch connecting lines
}

export const DEFAULT_CONFIG: WireframeConfig = {
  baseRadius: 0.4,
  rowSpacing: 0.3,
  zIncrement: 0.015,
  heightScale: 0.08,
  showConnectors: true,
};

// Stitch position in 3D space
export interface StitchPosition {
  row: number;
  stitch: number;
  type: CrochetStitchType;
  x: number;
  y: number;
  z: number;
  angle: number;
  radius: number;
}

/**
 * Calculate 3D positions for all stitches with spiral topology
 */
export function calculateStitchPositions(
  stitches: ParsedStitch[],
  config: WireframeConfig = DEFAULT_CONFIG
): StitchPosition[] {
  const positions: StitchPosition[] = [];
  
  // Group by row
  const rowGroups: Record<number, ParsedStitch[]> = {};
  for (const st of stitches) {
    if (!rowGroups[st.row]) rowGroups[st.row] = [];
    rowGroups[st.row].push(st);
  }
  
  let cumulativeStitchIndex = 0;
  
  const rows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);
  
  for (const rowNum of rows) {
    const rowStitches = rowGroups[rowNum];
    const radius = config.baseRadius + (rowNum - 1) * config.rowSpacing;
    const angleStep = (2 * Math.PI) / rowStitches.length;
    
    rowStitches.forEach((st, i) => {
      // Apply spiral: Z increases per stitch, not per row
      const z = cumulativeStitchIndex * config.zIncrement;
      const angle = i * angleStep - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      positions.push({
        row: st.row,
        stitch: st.stitch,
        type: st.type,
        x,
        y,
        z,
        angle,
        radius,
      });
      
      cumulativeStitchIndex++;
    });
  }
  
  return positions;
}

/**
 * Generate line segment vertices for a single stitch
 */
function generateStitchVertices(
  pos: StitchPosition,
  config: WireframeConfig
): number[] {
  const vertices: number[] = [];
  const props = STITCH_3D_PROPS[pos.type] || STITCH_3D_PROPS.default;
  const height = props.height * config.heightScale;
  const width = props.width;
  
  // Direction vectors (outward from center + tangent)
  const outX = Math.cos(pos.angle);
  const outY = Math.sin(pos.angle);
  const tangentX = -Math.sin(pos.angle);
  const tangentY = Math.cos(pos.angle);
  
  // Base position
  const baseX = pos.x;
  const baseY = pos.y;
  const baseZ = pos.z;
  
  // Generate stitch shape based on type
  switch (pos.type) {
    case 'sc':
      // Single crochet: simple V shape
      // Vertical stem
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height);
      // V head left
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX + tangentX * 0.03, baseY + tangentY * 0.03, baseZ + height * 0.8);
      // V head right
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX - tangentX * 0.03, baseY - tangentY * 0.03, baseZ + height * 0.8);
      break;
      
    case 'hdc':
      // Half double: taller with wrap indication
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height);
      // Wrap line
      vertices.push(baseX + tangentX * 0.02, baseY + tangentY * 0.02, baseZ + height * 0.5);
      vertices.push(baseX - tangentX * 0.02, baseY - tangentY * 0.02, baseZ + height * 0.6);
      // V head
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX + tangentX * 0.03, baseY + tangentY * 0.03, baseZ + height * 0.85);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX - tangentX * 0.03, baseY - tangentY * 0.03, baseZ + height * 0.85);
      break;
      
    case 'dc':
      // Double crochet: tall with two wraps
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height);
      // Wrap 1
      vertices.push(baseX + tangentX * 0.02, baseY + tangentY * 0.02, baseZ + height * 0.35);
      vertices.push(baseX - tangentX * 0.02, baseY - tangentY * 0.02, baseZ + height * 0.45);
      // Wrap 2
      vertices.push(baseX + tangentX * 0.02, baseY + tangentY * 0.02, baseZ + height * 0.6);
      vertices.push(baseX - tangentX * 0.02, baseY - tangentY * 0.02, baseZ + height * 0.7);
      // V head
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX + tangentX * 0.03, baseY + tangentY * 0.03, baseZ + height * 0.9);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX - tangentX * 0.03, baseY - tangentY * 0.03, baseZ + height * 0.9);
      break;
      
    case 'tr':
      // Treble: very tall with three wraps
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height);
      // Three wraps
      for (let w = 0; w < 3; w++) {
        const wZ = height * (0.25 + w * 0.2);
        vertices.push(baseX + tangentX * 0.02, baseY + tangentY * 0.02, baseZ + wZ);
        vertices.push(baseX - tangentX * 0.02, baseY - tangentY * 0.02, baseZ + wZ + height * 0.08);
      }
      // V head
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX + tangentX * 0.03, baseY + tangentY * 0.03, baseZ + height * 0.92);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX - tangentX * 0.03, baseY - tangentY * 0.03, baseZ + height * 0.92);
      break;
      
    case 'inc':
    case 'inc3':
    case 'inc4':
    case 'inc5':
      // Increase: fork into 2+ branches
      const forkCount = pos.type === 'inc' ? 2 : pos.type === 'inc3' ? 3 : pos.type === 'inc4' ? 4 : 5;
      // Stem
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height * 0.4);
      // Fork branches
      const forkSpread = (width - 1) * 0.04;
      for (let f = 0; f < forkCount; f++) {
        const fOffset = (f - (forkCount - 1) / 2) * forkSpread;
        vertices.push(baseX, baseY, baseZ + height * 0.4);
        vertices.push(
          baseX + tangentX * fOffset, 
          baseY + tangentY * fOffset, 
          baseZ + height
        );
      }
      break;
      
    case 'dec':
    case 'dec3':
    case 'sc2tog':
    case 'dc2tog':
    case 'dc3tog':
      // Decrease: merge lines converging
      const mergeCount = (pos.type === 'dec' || pos.type === 'sc2tog' || pos.type === 'dc2tog') ? 2 : 3;
      const mergeSpread = 0.05;
      // Convergent lines
      for (let m = 0; m < mergeCount; m++) {
        const mOffset = (m - (mergeCount - 1) / 2) * mergeSpread;
        vertices.push(
          baseX + tangentX * mOffset,
          baseY + tangentY * mOffset,
          baseZ
        );
        vertices.push(baseX, baseY, baseZ + height * 0.6);
      }
      // Single stem up
      vertices.push(baseX, baseY, baseZ + height * 0.6);
      vertices.push(baseX, baseY, baseZ + height);
      break;
      
    case 'chain':
    case 'slip':
      // Simple loop shape
      const loopHeight = height;
      const loopWidth = 0.02;
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX + tangentX * loopWidth, baseY + tangentY * loopWidth, baseZ + loopHeight * 0.5);
      vertices.push(baseX + tangentX * loopWidth, baseY + tangentY * loopWidth, baseZ + loopHeight * 0.5);
      vertices.push(baseX, baseY, baseZ + loopHeight);
      vertices.push(baseX, baseY, baseZ + loopHeight);
      vertices.push(baseX - tangentX * loopWidth, baseY - tangentY * loopWidth, baseZ + loopHeight * 0.5);
      vertices.push(baseX - tangentX * loopWidth, baseY - tangentY * loopWidth, baseZ + loopHeight * 0.5);
      vertices.push(baseX, baseY, baseZ);
      break;
      
    default:
      // Default SC-like shape
      vertices.push(baseX, baseY, baseZ);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX + tangentX * 0.03, baseY + tangentY * 0.03, baseZ + height * 0.8);
      vertices.push(baseX, baseY, baseZ + height);
      vertices.push(baseX - tangentX * 0.03, baseY - tangentY * 0.03, baseZ + height * 0.8);
  }
  
  return vertices;
}

/**
 * Generate connector lines between adjacent stitches
 */
function generateConnectorVertices(
  positions: StitchPosition[],
  config: WireframeConfig
): number[] {
  const vertices: number[] = [];
  
  if (!config.showConnectors || positions.length < 2) return vertices;
  
  // Connect stitches in the same row
  const rowGroups: Record<number, StitchPosition[]> = {};
  for (const pos of positions) {
    if (!rowGroups[pos.row]) rowGroups[pos.row] = [];
    rowGroups[pos.row].push(pos);
  }
  
  for (const rowPositions of Object.values(rowGroups)) {
    for (let i = 0; i < rowPositions.length; i++) {
      const current = rowPositions[i];
      const next = rowPositions[(i + 1) % rowPositions.length];
      
      const currentHeight = (STITCH_3D_PROPS[current.type] || STITCH_3D_PROPS.default).height * config.heightScale;
      
      // Connect top of current stitch to base of next
      vertices.push(current.x, current.y, current.z + currentHeight);
      vertices.push(next.x, next.y, next.z);
    }
  }
  
  return vertices;
}

/**
 * Main function: Generate complete wireframe vertex buffer
 */
export function generateWireframeVertices(
  stitches: ParsedStitch[],
  config: WireframeConfig = DEFAULT_CONFIG
): Float32Array {
  if (stitches.length === 0) {
    return new Float32Array(0);
  }
  
  // Calculate positions with spiral topology
  const positions = calculateStitchPositions(stitches, config);
  
  // Collect all vertices
  const allVertices: number[] = [];
  
  // Generate stitch geometry
  for (const pos of positions) {
    const stitchVerts = generateStitchVertices(pos, config);
    allVertices.push(...stitchVerts);
  }
  
  // Generate connectors
  if (config.showConnectors) {
    const connectorVerts = generateConnectorVertices(positions, config);
    allVertices.push(...connectorVerts);
  }
  
  return new Float32Array(allVertices);
}

/**
 * Get anchor indices for layer correspondence visualization
 * Maps each stitch to its parent stitch(es) in the previous row
 */
export function calculateAnchorIndices(stitches: ParsedStitch[]): Map<string, number[]> {
  const anchors = new Map<string, number[]>();
  
  // Group by row
  const rowGroups: Record<number, ParsedStitch[]> = {};
  for (const st of stitches) {
    if (!rowGroups[st.row]) rowGroups[st.row] = [];
    rowGroups[st.row].push(st);
  }
  
  const rows = Object.keys(rowGroups).map(Number).sort((a, b) => a - b);
  
  for (let rIdx = 1; rIdx < rows.length; rIdx++) {
    const currentRow = rows[rIdx];
    const prevRow = rows[rIdx - 1];
    const currentStitches = rowGroups[currentRow];
    const prevStitches = rowGroups[prevRow];
    
    if (!prevStitches || prevStitches.length === 0) continue;
    
    // Calculate stitch-to-parent mapping
    // Simple linear mapping for now (can be enhanced for inc/dec tracking)
    let prevIdx = 0;
    let prevConsumed = 0;
    
    currentStitches.forEach((st, i) => {
      const key = `${st.row}-${st.stitch}`;
      const parentIndices: number[] = [];
      
      // For decrease: consume 2 parent stitches
      if (st.type === 'dec' || st.type === 'sc2tog' || st.type === 'dc2tog') {
        if (prevIdx < prevStitches.length) {
          parentIndices.push(prevIdx);
          prevIdx++;
        }
        if (prevIdx < prevStitches.length) {
          parentIndices.push(prevIdx);
          prevIdx++;
        }
      } else if (st.type === 'inc' && prevConsumed === 0) {
        // For increase: share parent with next stitch
        if (prevIdx < prevStitches.length) {
          parentIndices.push(prevIdx);
          prevConsumed = 1; // Next stitch will also use this parent
        }
      } else if (prevConsumed > 0) {
        // Second stitch of an increase pair
        if (prevIdx < prevStitches.length) {
          parentIndices.push(prevIdx);
        }
        prevIdx++;
        prevConsumed = 0;
      } else {
        // Regular 1:1 mapping
        if (prevIdx < prevStitches.length) {
          parentIndices.push(prevIdx);
          prevIdx++;
        }
      }
      
      anchors.set(key, parentIndices);
    });
  }
  
  return anchors;
}

/**
 * Get stitch position by row and stitch index
 */
export function getStitchPosition(
  row: number,
  stitch: number,
  positions: StitchPosition[]
): StitchPosition | undefined {
  return positions.find(p => p.row === row && p.stitch === stitch);
}
