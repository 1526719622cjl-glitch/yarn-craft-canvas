

# Pixel Generator Fixes - Stitch Ratio, Grid Lines & Import Consistency

## Issues Identified

### 1. Cell Size Doesn't Change with Stitch Type
**Current Problem**: The code uses a fixed `cellSize = 14` (line 461), but you want cells to visually reflect the stitch ratio:
- SC: 1:1 (square, e.g., 14×14)
- HDC: 1:1.5 (taller, e.g., 14×21)
- DC: 1:2 (tall, e.g., 14×28)

**Fix**: Change from fixed `cellSize` to `cellWidth` and `cellHeight` that respond to `stitchRatio`:
```typescript
const cellWidth = 14;
const cellHeight = cellWidth * getStitchRatio(stitchType);
```

### 2. Grid Lines Not Showing for Non-10×10 Subdivisions
**Current Problem**: In `renderCell` (lines 680-715), only major 10×10 lines use `majorBorderStyle`, and regular cells use 1px border. But the logic `(cell.x + 1) % 10 === 0` only catches every 10th cell, leaving cells 1-9 with thin borders that may not display consistently.

**Fix**: Ensure ALL cells have visible border lines, not just major ones:
```typescript
const borderStyle = showGridLines ? '1px solid rgba(0,0,0,0.15)' : 'none';
```
Also add visible minor tick marks at 5-cell intervals in the ruler.

### 3. Ruler Numbers Don't Align with 10×10 Major Lines
**Current Problem**: The ruler shows numbers at 10/20/30 positions, but the alignment may drift due to cell sizing. The ruler tick marks need to visually connect with the grid's major lines.

**Fix**: 
1. Update `Ruler` component to use `cellWidth` and `cellHeight` separately (not a single `cellSize`)
2. Add a visual tick line extending from the ruler number to the grid edge
3. Ensure `effectiveCellSize` calculation accounts for the correct dimension (width for horizontal ruler, height for vertical)

### 4. Delete Combined Ratio Feature
**Current Problem**: You don't need the "Combined Ratio" manual control section (lines 1096-1174).

**Fix**: Remove:
- `useManualRatio` and `manualRatio` state variables
- The entire "Combined Ratio" UI section
- Keep using `stitchRatio` directly from stitch type selection

### 5. Image Import Size Inconsistent in Preview
**Current Problem**: When selecting canvas size in `CanvasSizeDialog`, the dimensions are passed to `handleCanvasSizeConfirm`, which calls `setCustomGridDimensions(canvasWidth, canvasHeight)`. However, `processImage` uses `customGridWidth` and `calculatedHeight` (which depends on lock/ratio settings), not the dimensions directly from the dialog.

**Flow Issue**:
1. Dialog confirms width=80, height=60
2. `setCustomGridDimensions(80, 60)` is called
3. But `processImage` uses `calculatedHeight` which is computed from `customGridWidth / combinedRatio`
4. If `lockAspectRatio` is true, the imported height is overwritten!

**Fix**: 
1. After canvas size confirmation, process image directly with the confirmed dimensions
2. Bypass the `calculatedHeight` logic for imported images
3. Store the confirmed dimensions and use them directly in `processImage`

---

## Implementation Plan

### Phase 1: Make Cell Size Respond to Stitch Type

**File**: `src/pages/PixelGenerator.tsx`

Replace fixed cell size with ratio-aware dimensions:

```typescript
// Line ~461: Replace const cellSize = 14;
const cellWidth = 14;
const cellHeight = Math.round(cellWidth * getStitchRatio(stitchType));
```

Update all `cellSize` references:
- `renderCell`: Use `cellWidth` and `cellHeight`
- `Ruler`: Pass `cellWidth` for horizontal, `cellHeight` for vertical
- Grid template: Use appropriate dimension
- Trace image overlay: Use `cellWidth` and `cellHeight`

### Phase 2: Fix Grid Line Display

**File**: `src/pages/PixelGenerator.tsx` (`renderCell` function)

Ensure all cells have visible borders:

```typescript
const renderCell = (cell: PixelCell, index: number) => {
  const isMajorX = (cell.x + 1) % 10 === 0;
  const isMajorY = (cell.y + 1) % 10 === 0;
  
  // All cells get visible thin border
  const thinBorder = showGridLines ? '1px solid rgba(0,0,0,0.12)' : 'none';
  // Major lines are thicker
  const majorBorder = showGridLines ? '2px solid hsl(var(--primary) / 0.5)' : 'none';

  return (
    <div
      style={{ 
        width: cellWidth, 
        height: cellHeight,
        backgroundColor: cell.color,
        borderRight: isMajorX ? majorBorder : thinBorder,
        borderBottom: isMajorY ? majorBorder : thinBorder,
        boxSizing: 'content-box',
      }}
      // ...handlers
    />
  );
};
```

### Phase 3: Fix Ruler Alignment with Tick Lines

**File**: `src/pages/PixelGenerator.tsx` (`Ruler` component)

Update to use separate width/height and add connecting tick lines:

```typescript
function Ruler({ 
  type, 
  size, 
  cellWidth,
  cellHeight,
  showGridLines = true, 
}: { 
  type: 'horizontal' | 'vertical'; 
  size: number; 
  cellWidth: number;
  cellHeight: number;
  showGridLines?: boolean;
}) {
  const rulerSize = 24;
  const effectiveCellWidth = cellWidth + (showGridLines ? 1 : 0);
  const effectiveCellHeight = cellHeight + (showGridLines ? 1 : 0);
  
  // For horizontal ruler, use width; for vertical, use height
  const effectiveCellSize = type === 'horizontal' ? effectiveCellWidth : effectiveCellHeight;
  
  // ... rest with tick marks connecting to grid
}
```

Add tick lines that extend from the ruler to connect with major grid lines.

### Phase 4: Remove Combined Ratio Section

**File**: `src/pages/PixelGenerator.tsx`

Remove:
1. State variables (lines 306-307):
   - `useManualRatio`
   - `manualRatio`

2. The ratio calculation (line 329):
   - Change to: `const combinedRatio = baseGaugeRatio * stitchRatio;`

3. The entire UI block (lines 1096-1174) - the "frosted-panel" with Combined Ratio controls

### Phase 5: Fix Image Import Dimensions

**File**: `src/pages/PixelGenerator.tsx`

Create a state to track if dimensions came from import dialog:

```typescript
const [importedDimensions, setImportedDimensions] = useState<{ width: number; height: number } | null>(null);

const handleCanvasSizeConfirm = useCallback((canvasWidth: number, canvasHeight: number) => {
  if (pendingCroppedImage) {
    // Store the exact dimensions from dialog
    setImportedDimensions({ width: canvasWidth, height: canvasHeight });
    setCustomGridDimensions(canvasWidth, canvasHeight);
    setUploadedImage(pendingCroppedImage.url);
    setPendingCroppedImage(null);
  }
}, [pendingCroppedImage, setCustomGridDimensions]);
```

Update `processImage` to use imported dimensions:

```typescript
const processImage = useCallback(() => {
  if (!uploadedImage || !canvasRef.current) return;
  
  // Use imported dimensions if available, otherwise calculate
  const targetWidth = importedDimensions?.width ?? customGridWidth;
  const targetHeight = importedDimensions?.height ?? calculatedHeight;
  
  // Clear imported dimensions after use
  // ... rest of processing
}, [uploadedImage, importedDimensions, customGridWidth, calculatedHeight, ...]);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PixelGenerator.tsx` | All fixes: cell sizing, grid lines, ruler, remove ratio, fix import |

---

## Technical Details

### Updated Ruler Component Signature

```typescript
function Ruler({ 
  type, 
  size, 
  cellWidth,
  cellHeight,
  showGridLines = true, 
}: { 
  type: 'horizontal' | 'vertical'; 
  size: number; 
  cellWidth: number;
  cellHeight: number;
  showGridLines?: boolean;
})
```

### Cell Border Widths

```typescript
// Major (10×10): 2px solid with primary color tint
// Minor (all others): 1px solid with subtle opacity
const borderThickness = isMajor ? 2 : 1;
```

### Grid Template Update

```typescript
style={{ 
  gridTemplateColumns: `repeat(${gridWidth}, ${cellWidth + (showGridLines ? 1 : 0)}px)`,
  gridAutoRows: `${cellHeight + (showGridLines ? 1 : 0)}px`,
}}
```

---

## Expected Outcome

1. **Stitch-responsive cells**: SC shows square cells, HDC shows 1.5x tall cells, DC shows 2x tall cells
2. **Visible grid lines**: All cell borders visible, 10×10 major lines thicker and colored
3. **Aligned rulers**: Numbers 10/20/30 perfectly align with major grid lines, tick marks connect to grid
4. **Simplified UI**: No Combined Ratio section (uses stitch type directly)
5. **Correct import**: Image fills the exact canvas dimensions selected in the dialog

