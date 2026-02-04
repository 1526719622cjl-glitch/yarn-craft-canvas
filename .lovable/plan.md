

# Pixel Generator Bug Fixes Plan

## Issues Identified

### 1. Grid Cell Aspect Ratio Changes During Zoom
**Current Problem**: The zoom slider changes the CSS `transform: scale()` of the entire grid container, but the individual cell sizes are calculated based on `combinedRatio` which includes stitch type ratio. The `previewZoom` slider scales everything together, but the underlying cell proportions are affected by the ratio calculation.

**Root Cause** (Line 428-429):
```typescript
const cellWidth = 14;
const cellHeight = cellWidth * combinedRatio;
```
This is correct for the cell aspect ratio based on stitch type. However, the zoom control is using CSS `transform: scale()` which should maintain proportions. The actual issue is that the **grid gap** changes relative to cell size when zooming.

**Fix**: Keep cells at fixed proportions. The current implementation is correct, but we need to ensure the grid uses `gap-0` consistently regardless of zoom level, or scale the gap proportionally.

### 2. Mouse Wheel Zoom Not Working
**Current Problem**: The preview area uses a manual `previewZoom` slider (lines 1033-1058) with CSS `transform: scale()`, but there's no mouse wheel event handler for zooming.

**Fix**: Add `onWheel` event handler to the preview container that adjusts `previewZoom` based on `deltaY`.

### 3. Trace Image Doesn't Match Grid
**Current Problem**: The trace image overlay (lines 1064-1074) uses:
```typescript
backgroundSize: '100% 100%',
```
But the grid itself is inside a container that's scaled by `previewZoom / 100`. The trace image is positioned with `absolute inset-0` which covers the entire container, not the scaled grid.

**Root Cause**: 
- The trace overlay is **outside** the zoom-transformed container
- The grid is inside a `transform: scale()` wrapper
- These don't align when zoom changes

**Fix**: Move the trace image **inside** the scaled container, or calculate its size to match the grid's actual pixel dimensions (`gridWidth * cellWidth` × `gridHeight * cellHeight`).

### 4. Ruler Numbers Don't Match Actual Grid Cells
**Current Problem**: The `Ruler` component (lines 173-248) calculates marker positions using `cellSize`:
```typescript
style={{ width: cellSize + 1, ...}}
```
But the grid itself has `gap-[1px]` when `showGridLines` is true (line 1086):
```typescript
className={`inline-grid ${showGridLines ? 'gap-[1px]' : 'gap-0'}`}
```
This creates a cumulative offset - each row/column adds 1px of gap, causing rulers and cells to drift apart.

**Fix**: Either:
1. Remove the gap from the grid and use borders on cells instead (already done partially)
2. OR adjust ruler positioning to account for cumulative gaps
3. Best approach: Use consistent cell borders instead of grid gap

### 5. Drawing Doesn't Change Color (Color Doesn't Apply)
**Current Problem**: When clicking to paint, the `handleCellClick` function calls `paintWithSymmetry(x, y, selectedColor)`, which calls `paintPixel` from the store. Looking at the store's `paintPixel`:
```typescript
paintPixel: (x, y, color) => {
  const { pixelGrid, gridWidth, gridHeight } = get();
  const idx = pixelGrid.findIndex(p => p.x === x && p.y === y);
  if (idx >= 0) {
    const newGrid = [...pixelGrid];
    newGrid[idx] = { ...newGrid[idx], color };
    set({ pixelGrid: newGrid });
  }
},
```
This looks correct. The issue might be:
1. The `selectedColor` not being updated when clicking palette colors
2. The eyedropper tool switching to pencil but not correctly setting color
3. The grid not re-rendering after state change

**Likely Cause**: In `handlePaletteColorClick` (line 624-628), the color is set correctly. However, if the user is in a different tool mode and clicks a palette color, it may not switch to pencil mode properly.

**Testing needed**: Check if `selectedColor` state updates correctly and if grid cells re-render.

---

## Implementation Plan

### Phase 1: Fix Trace Image Alignment

Move the trace overlay inside the zoom-scaled container and calculate exact dimensions:

**File**: `src/pages/PixelGenerator.tsx` (lines 1060-1094)

Change the trace image from using `inset-0` to using calculated dimensions that match the grid:
```typescript
{uploadedImage && traceOpacity > 0 && (
  <div 
    className="absolute pointer-events-none z-0"
    style={{ 
      // Position at grid start (after rulers)
      left: 24, // ruler width
      top: 24,  // ruler height
      width: gridWidth * cellWidth,
      height: gridHeight * cellHeight,
      backgroundImage: `url(${uploadedImage})`,
      backgroundSize: '100% 100%',
      opacity: traceOpacity / 100,
      mixBlendMode: 'multiply',
    }}
  />
)}
```

### Phase 2: Fix Ruler Alignment (Remove Grid Gap)

The grid currently uses `gap-[1px]` which causes cumulative offset. Change to use cell borders instead:

**File**: `src/pages/PixelGenerator.tsx`

1. Remove the `gap-[1px]` from the grid container (line 1086)
2. Cell borders are already implemented via className in `renderCell`
3. Update ruler cellSize to match exact cell dimensions

### Phase 3: Add Mouse Wheel Zoom

**File**: `src/pages/PixelGenerator.tsx`

Add wheel event handler to the preview container:
```typescript
const handleWheel = useCallback((e: React.WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -10 : 10;
  setPreviewZoom(prev => Math.max(25, Math.min(200, prev + delta)));
}, []);

// Add to container:
<div 
  className="relative overflow-auto..."
  onWheel={handleWheel}
>
```

### Phase 4: Add Click-Drag Panning

Currently only spacebar-drag works in InfiniteCanvas. Add mouse drag panning for the preview area:

**File**: `src/pages/PixelGenerator.tsx`

Add pan state and handlers:
```typescript
const [isPanning, setIsPanning] = useState(false);
const [panStart, setPanStart] = useState({ x: 0, y: 0 });
const scrollRef = useRef<HTMLDivElement>(null);
```

### Phase 5: Fix Color Drawing Issue

**File**: `src/pages/PixelGenerator.tsx`

Debug the color application by:
1. Ensuring `selectedColor` is correctly passed to `paintWithSymmetry`
2. Checking if grid cell re-rendering occurs after `paintPixel` updates state
3. Adding console logging to trace the flow

**Likely fix**: The grid uses `gap-[1px]` which may be causing rendering issues. Also verify that the cell's `backgroundColor` style correctly receives the updated color.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PixelGenerator.tsx` | Fix trace image positioning, remove grid gap, add wheel zoom, fix color painting flow |

---

## Technical Details

### Corrected Trace Image Position
```typescript
// Inside the zoom-scaled container, position trace relative to grid
<div 
  className="absolute pointer-events-none z-0"
  style={{ 
    left: 24, // after vertical ruler
    top: 24,  // after horizontal ruler
    width: gridWidth * cellWidth,
    height: gridHeight * cellHeight,
    backgroundImage: `url(${uploadedImage})`,
    backgroundSize: '100% 100%',
    opacity: traceOpacity / 100,
    mixBlendMode: 'multiply',
  }}
/>
```

### Grid Without Gap (Using Cell Borders)
```typescript
<div 
  className="inline-grid"
  style={{ 
    gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth}px)`,
  }}
>
  {pixelGrid.map((cell, i) => renderCell(cell, i))}
</div>

// Cell border styling in renderCell:
style={{ 
  width: cellWidth, 
  height: cellHeight,
  backgroundColor: cell.color,
  borderRight: showGridLines ? '1px solid rgba(0,0,0,0.1)' : 'none',
  borderBottom: showGridLines ? '1px solid rgba(0,0,0,0.1)' : 'none',
}}
```

### Mouse Wheel Zoom Handler
```typescript
const handleWheel = useCallback((e: React.WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -10 : 10;
    setPreviewZoom(prev => Math.max(25, Math.min(200, prev + delta)));
  }
}, []);
```

---

## Expected Outcome

1. **Fixed aspect ratio**: Grid cells maintain consistent proportions at all zoom levels
2. **Mouse wheel zoom**: Ctrl/Cmd + scroll wheel zooms in/out
3. **Aligned trace image**: The uploaded image overlay exactly matches the grid dimensions
4. **Aligned rulers**: Ruler tick marks match actual grid cell positions
5. **Working color painting**: Selected colors correctly apply when drawing

