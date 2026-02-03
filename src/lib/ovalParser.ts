import { CrochetStitch } from '@/store/useYarnCluesStore';

interface OvalParsedResult {
  stitches: ParsedOvalStitch[];
  axis: {
    startChain: number;
    topSide: number[];
    bottomSide: number[];
    turnStart: 'v' | 'w';
    turnEnd: 'v' | 'w';
  };
  // Stadium dimensions for rendering
  stadiumLayout: {
    straightLength: number;
    endRadius: number;
    totalWidth: number;
    totalHeight: number;
  };
}

export interface ParsedOvalStitch {
  row: number;
  stitch: number;
  type: CrochetStitch;
  side: 'top' | 'bottom' | 'turn-start' | 'turn-end';
  parentStitchId?: string;
  x: number;
  y: number;
  angle?: number; // For turn stitches
  modifier?: 'blo' | 'flo'; // Back loop only / Front loop only
}

interface BezierConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  controlPoints: [{ x: number; y: number }, { x: number; y: number }];
  type: 'increase' | 'decrease' | 'normal';
}

// CRITICAL: Parse oval foundation chain with LINEAR AXIS rendering
// Creates a stadium/track shape, NOT a circular blob
export function parseOvalFoundation(input: string): OvalParsedResult | null {
  const chainMatch = input.match(/ch\s*(\d+)/i);
  if (!chainMatch) return null;

  const chainCount = parseInt(chainMatch[1]);
  if (chainCount < 3) return null;

  // Standard oval layout:
  // - Chains 2 to N-1 on top (left to right)
  // - W (3 stitches) on the end cap (right)
  // - Chains N-1 to 2 on bottom (right to left)
  // - V (2 stitches) on the start cap (left)
  const topSideCount = chainCount - 2; // Excluding the skipped 1st chain and the last chain
  const bottomSideCount = chainCount - 2;

  const topSideChains = [];
  const bottomSideChains = [];

  for (let i = 2; i <= chainCount - 1; i++) {
    topSideChains.push(i);
    bottomSideChains.unshift(i); // Reverse for bottom
  }

  // STADIUM LAYOUT CALCULATION
  // Linear axis with semicircular ends
  const spacing = 30; // Pixel spacing between stitches
  const straightLength = Math.max(0, (topSideCount - 1) * spacing);
  const endRadius = spacing * 1.2; // Radius for the semicircular ends
  
  const stitches: ParsedOvalStitch[] = [];
  let stitchNum = 0;

  // =====================================
  // TOP SIDE: Linear axis (left to right)
  // =====================================
  topSideChains.forEach((chain, i) => {
    stitchNum++;
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: 'sc',
      side: 'top',
      x: i * spacing,
      y: 0,
    });
  });

  // =====================================
  // TURN END (RIGHT): W - 3 stitches in semicircle
  // =====================================
  const turnEndCenterX = straightLength;
  const turnEndCenterY = endRadius;
  
  for (let i = 0; i < 3; i++) {
    stitchNum++;
    // Distribute 3 stitches over the right semicircle (-90° to +90°)
    const angleStart = -Math.PI / 2;
    const angleStep = Math.PI / 2; // 90° between each stitch
    const angle = angleStart + i * angleStep;
    
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: i === 1 ? 'inc' : 'sc', // Middle stitch is the peak
      side: 'turn-end',
      x: turnEndCenterX + Math.cos(angle) * endRadius,
      y: turnEndCenterY + Math.sin(angle) * endRadius,
      angle: angle + Math.PI / 2, // Tangent angle for stitch rotation
    });
  }

  // =====================================
  // BOTTOM SIDE: Linear axis (right to left)
  // =====================================
  bottomSideChains.forEach((chain, i) => {
    stitchNum++;
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: 'sc',
      side: 'bottom',
      x: straightLength - i * spacing,
      y: endRadius * 2, // Bottom row offset
    });
  });

  // =====================================
  // TURN START (LEFT): V - 2 stitches in semicircle
  // =====================================
  const turnStartCenterX = 0;
  const turnStartCenterY = endRadius;
  
  for (let i = 0; i < 2; i++) {
    stitchNum++;
    // Distribute 2 stitches over the left semicircle (90° to 270°)
    const angleStart = Math.PI / 2;
    const angleStep = Math.PI / 1; // 180° for 2 stitches
    const angle = angleStart + i * angleStep;
    
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: 'inc',
      side: 'turn-start',
      x: turnStartCenterX + Math.cos(angle) * endRadius,
      y: turnStartCenterY + Math.sin(angle) * endRadius,
      angle: angle + Math.PI / 2,
    });
  }

  return {
    stitches,
    axis: {
      startChain: chainCount,
      topSide: topSideChains,
      bottomSide: bottomSideChains,
      turnStart: 'v',
      turnEnd: 'w',
    },
    stadiumLayout: {
      straightLength,
      endRadius,
      totalWidth: straightLength + endRadius * 2,
      totalHeight: endRadius * 2,
    },
  };
}

// Generate subsequent oval rows that follow the stadium shape
export function generateOvalRow(
  rowNumber: number,
  previousRow: ParsedOvalStitch[],
  stitchPattern: { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[],
  rowSpacing: number = 25
): ParsedOvalStitch[] {
  const stitches: ParsedOvalStitch[] = [];
  let totalStitches = stitchPattern.reduce((sum, p) => sum + p.count, 0);
  
  // Calculate the perimeter path of the previous row
  // Offset outward for new row
  const offset = rowSpacing;
  
  // Get bounding box of previous row
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  previousRow.forEach(s => {
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  });
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const radiusX = (maxX - minX) / 2 + offset;
  const radiusY = (maxY - minY) / 2 + offset;
  
  // Distribute stitches around the oval
  let stitchNum = 0;
  let patternIdx = 0;
  let countInPattern = 0;
  let currentModifier: 'blo' | 'flo' | undefined;
  
  for (let i = 0; i < totalStitches; i++) {
    // Get current stitch type from pattern
    while (patternIdx < stitchPattern.length && countInPattern >= stitchPattern[patternIdx].count) {
      patternIdx++;
      countInPattern = 0;
    }
    
    if (patternIdx >= stitchPattern.length) break;
    
    const currentPattern = stitchPattern[patternIdx];
    const type = currentPattern.type;
    currentModifier = currentPattern.modifier;
    countInPattern++;
    stitchNum++;
    
    // Calculate position on oval perimeter
    const angle = (i / totalStitches) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    
    // Determine side based on angle
    let side: 'top' | 'bottom' | 'turn-start' | 'turn-end';
    if (angle >= -Math.PI / 4 && angle < Math.PI / 4) {
      side = 'turn-end';
    } else if (angle >= Math.PI / 4 && angle < 3 * Math.PI / 4) {
      side = 'bottom';
    } else if (angle >= 3 * Math.PI / 4 || angle < -3 * Math.PI / 4) {
      side = 'turn-start';
    } else {
      side = 'top';
    }
    
    stitches.push({
      row: rowNumber,
      stitch: stitchNum,
      type,
      side,
      x,
      y,
      angle: angle + Math.PI / 2,
      modifier: currentModifier,
    });
  }
  
  return stitches;
}

// Generate Bezier connections for stitch topology
export function generateBezierConnections(
  currentRow: ParsedOvalStitch[],
  previousRow: ParsedOvalStitch[]
): BezierConnection[] {
  const connections: BezierConnection[] = [];

  currentRow.forEach((stitch, i) => {
    // Find parent stitch(es)
    let parentIndices: number[] = [];

    if (stitch.type === 'inc') {
      // Increase: one parent, two children
      const parentIdx = Math.floor(i / 2);
      if (parentIdx < previousRow.length) {
        parentIndices = [parentIdx];
      }
    } else if (stitch.type === 'dec') {
      // Decrease: two parents, one child
      const parentIdx1 = Math.min(i, previousRow.length - 1);
      const parentIdx2 = Math.min(i + 1, previousRow.length - 1);
      parentIndices = [parentIdx1, parentIdx2];
    } else {
      // Normal: one-to-one
      const parentIdx = Math.min(i, previousRow.length - 1);
      parentIndices = [parentIdx];
    }

    parentIndices.forEach((parentIdx) => {
      const parent = previousRow[parentIdx];
      if (!parent) return;

      const from = { x: parent.x, y: parent.y };
      const to = { x: stitch.x, y: stitch.y };
      const midY = (from.y + to.y) / 2;

      // Bezier control points for smooth curves
      const controlPoints: [{ x: number; y: number }, { x: number; y: number }] = [
        { x: from.x, y: midY },
        { x: to.x, y: midY },
      ];

      connections.push({
        from,
        to,
        controlPoints,
        type: stitch.type === 'inc' ? 'increase' : stitch.type === 'dec' ? 'decrease' : 'normal',
      });
    });
  });

  return connections;
}

// Calculate parent stitch ID for topology
export function calculateParentStitch(
  row: number,
  stitch: number,
  stitchType: CrochetStitch,
  previousRowCount: number
): string | null {
  if (row <= 1) return null;

  const prevRow = row - 1;

  if (stitchType === 'inc') {
    // Increase comes from single parent
    const parentStitch = Math.ceil(stitch / 2);
    return `${prevRow}-${parentStitch}`;
  }

  if (stitchType === 'dec') {
    // Decrease merges two parents
    return `${prevRow}-${stitch}:${prevRow}-${stitch + 1}`;
  }

  // Normal stitch - direct parent
  const parentStitch = Math.min(stitch, previousRowCount);
  return `${prevRow}-${parentStitch}`;
}

// SVG path for Bezier curve
export function bezierPath(connection: BezierConnection): string {
  const { from, to, controlPoints } = connection;
  return `M ${from.x} ${from.y} C ${controlPoints[0].x} ${controlPoints[0].y}, ${controlPoints[1].x} ${controlPoints[1].y}, ${to.x} ${to.y}`;
}

// Generate SVG path for stadium outline
export function stadiumOutlinePath(layout: OvalParsedResult['stadiumLayout']): string {
  const { straightLength, endRadius, totalHeight } = layout;
  const halfHeight = totalHeight / 2;
  
  // Start at top-left, go right, around right semicircle, back left, around left semicircle
  return `
    M 0 0
    L ${straightLength} 0
    A ${endRadius} ${endRadius} 0 0 1 ${straightLength} ${totalHeight}
    L 0 ${totalHeight}
    A ${endRadius} ${endRadius} 0 0 1 0 0
    Z
  `;
}

// Extended stitch positioning for circular charts with proper angle distribution
export function calculateCircularPosition(
  row: number,
  stitchIndex: number,
  totalStitchesInRow: number,
  centerX: number,
  centerY: number,
  baseRadius: number = 30,
  radiusIncrement: number = 40
): { x: number; y: number; rotation: number } {
  const radius = baseRadius + row * radiusIncrement;
  const angleStep = (2 * Math.PI) / totalStitchesInRow;
  const angle = stitchIndex * angleStep - Math.PI / 2; // Start from top

  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    rotation: angle + Math.PI / 2, // Tangential rotation
  };
}

// Parse advanced pattern syntax including oval constructions and BLO/FLO
export function parseAdvancedPattern(input: string): {
  rows: { row: number; stitches: { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[]; isOval?: boolean }[];
  isOvalStart: boolean;
} {
  const lines = input.split('\n').filter(l => l.trim());
  const rows: { row: number; stitches: { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[]; isOval?: boolean }[] = [];
  let isOvalStart = false;

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim().toLowerCase();
    
    // Check for chain start (oval foundation)
    if (trimmed.includes('ch') && (trimmed.includes('chain from hook') || trimmed.includes('from hook'))) {
      isOvalStart = true;
      const chainMatch = trimmed.match(/ch\s*(\d+)/);
      if (chainMatch) {
        const chainCount = parseInt(chainMatch[1]);
        // Create oval foundation row
        rows.push({
          row: lineIdx + 1,
          stitches: [
            { type: 'sc', count: chainCount - 2 }, // Top side
            { type: 'inc', count: 3 }, // W at end
            { type: 'sc', count: chainCount - 2 }, // Bottom side
            { type: 'inc', count: 2 }, // V at start
          ],
          isOval: true,
        });
      }
    } else {
      // Parse normal pattern syntax with BLO/FLO support
      const stitches = parseRowSyntax(trimmed);
      if (stitches.length > 0) {
        rows.push({
          row: lineIdx + 1,
          stitches,
          isOval: false,
        });
      }
    }
  });

  return { rows, isOvalStart };
}

// Parse single row syntax with BLO/FLO support
function parseRowSyntax(line: string): { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[] {
  const stitches: { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[] = [];
  
  // Check for global BLO/FLO modifier at start of line
  let globalModifier: 'blo' | 'flo' | undefined;
  if (line.startsWith('blo ')) {
    globalModifier = 'blo';
    line = line.substring(4);
  } else if (line.startsWith('flo ')) {
    globalModifier = 'flo';
    line = line.substring(4);
  }

  // Handle repeat syntax: (2x, v)*6
  const repeatMatch = line.match(/\(([^)]+)\)\*(\d+)/g);
  if (repeatMatch) {
    repeatMatch.forEach(match => {
      const inner = match.match(/\(([^)]+)\)\*(\d+)/);
      if (inner) {
        const pattern = inner[1];
        const repeats = parseInt(inner[2]);
        const innerStitches = parseSimpleStitches(pattern, globalModifier);
        for (let r = 0; r < repeats; r++) {
          stitches.push(...innerStitches);
        }
      }
    });
  }

  // Handle simple patterns: 6x, 3v, blo 5x, etc.
  const simpleMatches = line.match(/(blo\s+|flo\s+)?(\d*)([xvatfewmslchbp])/g);
  if (simpleMatches && !repeatMatch) {
    simpleMatches.forEach(match => {
      let modifier = globalModifier;
      let cleanMatch = match;
      
      if (match.includes('blo ')) {
        modifier = 'blo';
        cleanMatch = match.replace('blo ', '');
      } else if (match.includes('flo ')) {
        modifier = 'flo';
        cleanMatch = match.replace('flo ', '');
      }
      
      const parsed = cleanMatch.match(/(\d*)([xvatfewmslchbp])/);
      if (parsed) {
        const count = parsed[1] ? parseInt(parsed[1]) : 1;
        const type = charToStitchType(parsed[2]);
        stitches.push({ type, count, modifier });
      }
    });
  }

  return stitches;
}

function parseSimpleStitches(pattern: string, globalModifier?: 'blo' | 'flo'): { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[] {
  const stitches: { type: CrochetStitch; count: number; modifier?: 'blo' | 'flo' }[] = [];
  const parts = pattern.split(',').map(p => p.trim());
  
  parts.forEach(part => {
    let modifier = globalModifier;
    let cleanPart = part;
    
    if (part.startsWith('blo ')) {
      modifier = 'blo';
      cleanPart = part.substring(4);
    } else if (part.startsWith('flo ')) {
      modifier = 'flo';
      cleanPart = part.substring(4);
    }
    
    const match = cleanPart.match(/(\d*)([xvatfewmslchbp])/);
    if (match) {
      const count = match[1] ? parseInt(match[1]) : 1;
      const type = charToStitchType(match[2]);
      stitches.push({ type, count, modifier });
    }
  });

  return stitches;
}

function charToStitchType(char: string): CrochetStitch {
  const mapping: Record<string, CrochetStitch> = {
    'x': 'sc',
    'v': 'inc',
    'a': 'dec',
    't': 'hdc',
    'f': 'dc',
    'e': 'tr',
    'w': 'dtr', // 3-inc mapped to dtr for now
    'm': 'dec', // 3-dec
    's': 'slip',
    'l': 'slip',
    'c': 'chain',
    'h': 'chain',
    'b': 'bobble',
    'p': 'puff',
  };
  return mapping[char] || 'sc';
}