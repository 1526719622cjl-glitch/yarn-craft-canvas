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
}

interface ParsedOvalStitch {
  row: number;
  stitch: number;
  type: CrochetStitch;
  side: 'top' | 'bottom' | 'turn-start' | 'turn-end';
  parentStitchId?: string;
  x: number;
  y: number;
}

interface BezierConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  controlPoints: [{ x: number; y: number }, { x: number; y: number }];
  type: 'increase' | 'decrease' | 'normal';
}

// Parse oval foundation chain (e.g., "Ch5, on 2nd chain from hook")
export function parseOvalFoundation(input: string): OvalParsedResult | null {
  const chainMatch = input.match(/ch\s*(\d+)/i);
  if (!chainMatch) return null;

  const chainCount = parseInt(chainMatch[1]);
  if (chainCount < 3) return null;

  // Standard oval: chains 2 to N-1 on top, W on end, chains N-1 to 2 on bottom, V at start
  const topSideChains = [];
  const bottomSideChains = [];

  for (let i = 2; i < chainCount; i++) {
    topSideChains.push(i);
    bottomSideChains.unshift(i); // Reverse for bottom
  }

  const stitches: ParsedOvalStitch[] = [];
  let stitchNum = 0;
  const spacing = 30;

  // Top side (left to right)
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

  // Turn end (W - 3 stitches in last chain)
  const turnEndX = (topSideChains.length - 1) * spacing + spacing / 2;
  for (let i = 0; i < 3; i++) {
    stitchNum++;
    const angle = -Math.PI / 2 + (i * Math.PI) / 4;
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: i === 1 ? 'sc' : 'sc', // Middle and sides
      side: 'turn-end',
      x: turnEndX + Math.cos(angle) * 15,
      y: spacing / 2 + Math.sin(angle) * 15,
    });
  }

  // Bottom side (right to left, offset Y)
  bottomSideChains.forEach((chain, i) => {
    stitchNum++;
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: 'sc',
      side: 'bottom',
      x: (topSideChains.length - 1 - i) * spacing,
      y: spacing,
    });
  });

  // Turn start (V - 2 stitches in first chain)
  const turnStartX = -spacing / 2;
  for (let i = 0; i < 2; i++) {
    stitchNum++;
    const angle = Math.PI / 2 + (i * Math.PI) / 3;
    stitches.push({
      row: 1,
      stitch: stitchNum,
      type: 'inc',
      side: 'turn-start',
      x: turnStartX + Math.cos(angle) * 15,
      y: spacing / 2 + Math.sin(angle) * 15,
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
  };
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

// Parse advanced pattern syntax including oval constructions
export function parseAdvancedPattern(input: string): {
  rows: { row: number; stitches: { type: CrochetStitch; count: number }[]; isOval?: boolean }[];
  isOvalStart: boolean;
} {
  const lines = input.split('\n').filter(l => l.trim());
  const rows: { row: number; stitches: { type: CrochetStitch; count: number }[]; isOval?: boolean }[] = [];
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
      // Parse normal pattern syntax
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

// Parse single row syntax
function parseRowSyntax(line: string): { type: CrochetStitch; count: number }[] {
  const stitches: { type: CrochetStitch; count: number }[] = [];

  // Handle repeat syntax: (2x, v)*6
  const repeatMatch = line.match(/\(([^)]+)\)\*(\d+)/g);
  if (repeatMatch) {
    repeatMatch.forEach(match => {
      const inner = match.match(/\(([^)]+)\)\*(\d+)/);
      if (inner) {
        const pattern = inner[1];
        const repeats = parseInt(inner[2]);
        const innerStitches = parseSimpleStitches(pattern);
        for (let r = 0; r < repeats; r++) {
          stitches.push(...innerStitches);
        }
      }
    });
  }

  // Handle simple patterns: 6x, 3v, etc.
  const simpleMatches = line.match(/(\d*)([xvatfewmslchbp])/g);
  if (simpleMatches && !repeatMatch) {
    simpleMatches.forEach(match => {
      const parsed = match.match(/(\d*)([xvatfewmslchbp])/);
      if (parsed) {
        const count = parsed[1] ? parseInt(parsed[1]) : 1;
        const type = charToStitchType(parsed[2]);
        stitches.push({ type, count });
      }
    });
  }

  return stitches;
}

function parseSimpleStitches(pattern: string): { type: CrochetStitch; count: number }[] {
  const stitches: { type: CrochetStitch; count: number }[] = [];
  const parts = pattern.split(',').map(p => p.trim());
  
  parts.forEach(part => {
    const match = part.match(/(\d*)([xvatfewmslchbp])/);
    if (match) {
      const count = match[1] ? parseInt(match[1]) : 1;
      const type = charToStitchType(match[2]);
      stitches.push({ type, count });
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
