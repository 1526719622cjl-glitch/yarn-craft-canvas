
# Pixel Generator & Crochet Engine 3D Enhancement Plan

## Overview

This plan addresses three major enhancements:
1. **Pixel Generator**: Canvas Dimensions display should reflect actual grid state
2. **Crochet Engine 2D Chart**: Layer correspondence learning from JIS standards
3. **Crochet Engine 3D Simulator**: High-performance wireframe rendering with spiral topology

---

## Part 1: Pixel Generator - Canvas Dimensions Sync

### Current Issue
The "Canvas Dimensions (stitches)" inputs show `customGridWidth` and `customGridHeight` values, but after importing an image or creating a canvas, the actual grid dimensions (`gridWidth` × `gridHeight`) may differ from these custom settings.

### Solution
Synchronize the Canvas Dimensions display with the actual grid state:
- When no grid exists: show editable custom dimensions for new canvas creation
- When grid exists: display the actual `gridWidth` × `gridHeight` values
- Allow editing to trigger a resize operation (using the existing scale logic)

### Files to Modify
- `src/pages/PixelGenerator.tsx`

### Implementation Details
```text
Line ~830-860: Update the Canvas Dimensions section

Current behavior:
  - Always shows customGridWidth × customGridHeight
  - Disconnected from actual pixelGrid state

New behavior:
  - Display actual gridWidth × gridHeight when pixelGrid.length > 0
  - Show "(Current)" label to indicate active state
  - Allow direct dimension input to trigger proportional resize
```

---

## Part 2: Crochet Engine 2D Chart - Layer Correspondence

### Learning from JIS Reference Book

Based on the crochet technique encyclopedia, the key relationships for 2D chart layer correspondence are:

**Stitch Anchor Points (上层与下层对应关系)**:
1. **Circular Rounds**: Each stitch in row N hooks into the top loop of a stitch in row N-1
2. **Increase (inc/V)**: Two stitches hook into the same anchor point
3. **Decrease (dec/A)**: One stitch hooks through two anchor points
4. **Stitch Offset (半针错位)**: Odd rows may offset by half a stitch width

**Visual Representation in 2D Charts**:
- Standard stitches: Centered above their anchor stitch
- Increases: V-shaped symbol indicating branch from single anchor
- Decreases: Inverted V showing convergence point
- Post stitches (fpdc/bpdc): Arrows showing direction around post

### Current Implementation Gap
The current 2D chart renders stitches at uniform angular positions without considering:
- Anchor point inheritance from previous row
- Visual connection lines between rows
- Increase/decrease topology visualization

### Solution
Add "anchor lines" connecting stitches to their parent stitch in the previous row, with special handling for increases (1→2) and decreases (2→1).

### Files to Modify
- `src/pages/CrochetEngine.tsx`
- `src/lib/enhancedCrochetParser.ts` (add anchor mapping)

### Implementation Details

**1. Parser Enhancement** (`enhancedCrochetParser.ts`):
```text
Add to ParsedStitch interface:
  - anchorIndex: number | number[]  // Parent stitch index(es) in previous row

Algorithm:
  - Track cumulative stitch count per row
  - For regular stitches: anchorIndex = corresponding index
  - For increase: anchorIndex = single parent, but outputs 2 children
  - For decrease: anchorIndex = [idx1, idx2] two parents merged
```

**2. Chart Visualization** (`CrochetEngine.tsx`):
```text
Add SVG connection lines in circular chart:
  - Draw thin curves from each stitch to its anchor(s)
  - Color-code: normal=gray, increase=rose, decrease=sage
  - Use quadratic bezier for smooth visual flow
```

---

## Part 3: 3D Crochet Wireframe Simulator

### Requirements Analysis

Based on the user specification and weishougong.cn reference:

**Rendering Approach**: Use `THREE.LineSegments` with `BufferGeometry`
- Single geometry with dynamic `Float32Array` vertex buffer
- No individual mesh objects per stitch
- Light gray background, dark yarn wireframe

**Stitch 3D Proportions** (from user specification):

| Stitch | Height (Z) | Width (X/Y) |
|--------|------------|-------------|
| ch (chain) | 0.5 | 1.0 |
| sc (single crochet) | 1.0 | 1.0 |
| hdc (half double) | 2.0 | 1.0 |
| dc (double crochet) | 3.0 | 1.0 |
| inc (increase) | 1.0 | 2.0 (fork) |
| dec (decrease) | 1.0 | 0.5 (merge) |

**Topology Features**:
1. **Spiral Ascent**: Z increases smoothly per stitch (not per round)
2. **Yarn Tension Simulation**: Fork at inc, convergence at dec
3. **Interactive Sync**: Click highlights corresponding text/2D chart

### Architecture

```text
New Component Structure:

src/components/3d/
├── CrochetWireframeScene.tsx    # Main R3F scene with LineSegments
├── useWireframeGeometry.ts      # Hook to generate/update vertex buffer
└── crochetPathGenerator.ts      # Convert pattern → 3D vertex array

Integration:
  - CrochetEngine.tsx imports CrochetWireframeScene
  - Replace current TubeGeometry 3D preview with new wireframe mode
  - Add toggle: "Yarn Tubes" vs "Wireframe" mode
```

### Vertex Generation Algorithm

```text
Input: ParsedStitch[] from parser
Output: Float32Array of line segment vertices

For each stitch:
  1. Calculate base position:
     - Angle = (stitchIndex / totalInRow) * 2π
     - Radius = baseRadius + (rowIndex * rowSpacing)
     - Z = cumulativeStitchIndex * zIncrement (spiral)

  2. Generate stitch geometry vertices:
     - sc: vertical line + V head (6 vertices = 3 segments)
     - dc: taller vertical + more wrap curves (12 vertices)
     - inc: fork into 2 branches (8 vertices)
     - dec: 2 inputs merging (8 vertices)

  3. Add inter-row connecting segments:
     - Line from stitch top to next stitch base
     - Creates continuous yarn path illusion

Performance:
  - Pre-allocate buffer for max 5000 stitches
  - Use Float32Array.set() for batch updates
  - geometry.attributes.position.needsUpdate = true in useFrame
```

### Files to Create/Modify

**New Files**:
1. `src/components/3d/CrochetWireframeScene.tsx`
2. `src/components/3d/useWireframeGeometry.ts`
3. `src/lib/crochetPathGenerator.ts`

**Modified Files**:
1. `src/pages/CrochetEngine.tsx` - Add wireframe mode toggle

---

## Detailed Implementation

### File 1: `src/lib/crochetPathGenerator.ts`

Purpose: Convert parsed crochet pattern to 3D wireframe vertices

```text
Constants:
  STITCH_HEIGHTS = { ch: 0.5, sc: 1.0, hdc: 2.0, dc: 3.0, tr: 4.0, inc: 1.0, dec: 1.0 }
  STITCH_WIDTHS = { default: 1.0, inc: 2.0, dec: 0.5 }
  Z_INCREMENT = 0.02  // Per stitch spiral rise
  BASE_RADIUS = 0.5
  ROW_SPACING = 0.4

Functions:
  generateWireframeVertices(stitches: ParsedStitch[]): Float32Array
    - Groups stitches by row
    - Calculates 3D position for each stitch
    - Generates line segment vertices for stitch shape
    - Returns flat Float32Array [x1,y1,z1, x2,y2,z2, ...]

  generateStitchSegments(type, position, scale): number[]
    - Returns vertex pairs for each stitch type
    - SC: simple V shape
    - DC: taller with cross-overs
    - INC: V fork with 2 branches
    - DEC: inverted V convergence
```

### File 2: `src/components/3d/useWireframeGeometry.ts`

Purpose: React hook managing BufferGeometry updates

```text
Hook: useWireframeGeometry(stitches: ParsedStitch[], options)

State:
  - geometryRef: THREE.BufferGeometry
  - positionAttribute: THREE.BufferAttribute

Logic:
  - On stitches change: regenerate vertices
  - Use useMemo for vertex generation
  - Update buffer attribute on change
  - Return { geometry, lineCount }

Options:
  - showConnectors: boolean (inter-stitch lines)
  - colorByRow: boolean
  - zSpiral: boolean (enable/disable spiral)
```

### File 3: `src/components/3d/CrochetWireframeScene.tsx`

Purpose: R3F scene component with LineSegments rendering

```text
Component: CrochetWireframeScene

Props:
  - chart: CrochetCell[]
  - hoveredCell: { row, stitch } | null
  - onStitchClick: (row, stitch) => void

Structure:
  <Canvas>
    <color attach="background" args={['#f0f0f0']} />  // Light gray
    <OrbitControls />
    
    <lineSegments>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute
          attach="attributes-position"
          array={vertices}
          count={vertexCount}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="#333333" linewidth={1} />
    </lineSegments>

    {/* Hover highlight */}
    {hoveredCell && <HighlightMesh position={getStitchPosition()} />}
  </Canvas>

Performance:
  - useFrame for smooth animation (optional rotation)
  - geometry.attributes.position.needsUpdate on pattern change
  - instancedMesh for highlight points (optional)
```

### File 4: `src/pages/CrochetEngine.tsx` Updates

```text
Changes:

1. Add state for 3D mode toggle:
   const [view3DMode, setView3DMode] = useState<'wireframe' | 'tubes'>('wireframe');

2. Add toggle buttons in 3D Preview header:
   <Button onClick={() => setView3DMode('wireframe')}>Wireframe</Button>
   <Button onClick={() => setView3DMode('tubes')}>Yarn Tubes</Button>

3. Conditional rendering:
   {view3DMode === 'wireframe' ? (
     <CrochetWireframeScene chart={crochetChart} ... />
   ) : (
     <Canvas><Crochet3DScene ... /></Canvas>
   )}

4. Add bidirectional selection sync:
   - Click on 3D stitch → highlight in 2D + scroll to text
   - Click on 2D stitch → highlight in 3D
   - Click on text token → highlight in both views
```

### File 5: 2D Chart Layer Connections (`CrochetEngine.tsx`)

```text
Add to circular chart rendering (lines 450-500):

Before stitch symbols, render anchor lines:

{Object.entries(rowGroups).map(([rowNum, cells]) => {
  const row = parseInt(rowNum);
  if (row <= 1) return null; // No connections from row 1
  
  const prevRow = rowGroups[row - 1] || [];
  
  return cells.map((cell, i) => {
    const anchorIndices = getAnchorIndices(cell, prevRow);
    // Draw SVG lines from cell position to anchor position(s)
    return anchorIndices.map(anchorIdx => (
      <line 
        key={`anchor-${row}-${i}-${anchorIdx}`}
        x1={cellX} y1={cellY}
        x2={anchorX} y2={anchorY}
        stroke={getAnchorColor(cell.type)}
        strokeWidth={0.5}
        opacity={0.4}
      />
    ));
  });
})}
```

---

## Technical Specifications

### Performance Targets
- Support up to 1000+ stitches at 60fps
- Geometry update < 16ms on pattern change
- Memory: Single Float32Array, no object allocation per frame

### Visual Style (matching weishougong.cn aesthetic)
- Background: `#f0f0f0` (light gray)
- Yarn lines: `#333333` (dark gray) or custom color
- Hover highlight: `#8B5CF6` (primary purple glow)
- Line width: 1-2px base, 3px on hover

### API Interface for Pattern Input
```typescript
interface PatternInstruction {
  command: string;      // e.g., "R1:6x" or "R2:(2x,v)*6"
  parsedStitches: ParsedStitch[];
  vertices: Float32Array;
}

function parsePatternToVertices(input: string): PatternInstruction[];
```

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/PixelGenerator.tsx` | Modify | Sync canvas dimensions display |
| `src/pages/CrochetEngine.tsx` | Modify | Add layer lines, wireframe toggle, bidirectional sync |
| `src/lib/enhancedCrochetParser.ts` | Modify | Add anchor index tracking |
| `src/lib/crochetPathGenerator.ts` | Create | Pattern → 3D vertices conversion |
| `src/components/3d/useWireframeGeometry.ts` | Create | BufferGeometry management hook |
| `src/components/3d/CrochetWireframeScene.tsx` | Create | LineSegments R3F scene |

---

## Future Enhancement: Full Bidirectional Sync

The plan includes foundation for click-to-highlight synchronization:
- Text editor cursor position → 2D/3D highlight
- 2D chart click → 3D highlight + text scroll
- 3D wireframe click → 2D highlight + text scroll

This creates a unified editing experience where all three views (Text, 2D Chart, 3D Model) stay synchronized.
