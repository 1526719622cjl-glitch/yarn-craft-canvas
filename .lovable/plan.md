

# Pixel Generator Enhancement Plan

## Issues Identified

### 1. No Canvas Size Selection When Importing Images
**Current Behavior**: When importing an image, the crop dialog opens but doesn't let the user choose what canvas size the cropped image will be placed on. The `customGridWidth` and auto-calculated height are used, which may not match the cropped image's aspect ratio.

**User Request**: Let users choose canvas dimensions (width × height) after cropping, with auto-suggested values based on the cropped image's aspect ratio to ensure the full image displays in the preview.

### 2. Cell Size Not Fixed - Changes Based on Stitch Ratio
**Current Behavior** (Lines 433-434):
```typescript
const cellWidth = 14;
const cellHeight = cellWidth * combinedRatio;
```
This causes cells to change height when `combinedRatio` changes (via stitch type or gauge). SC should be the baseline (1:1 square cells).

**Fix**: Use a fixed base cell size (e.g., 14×14 pixels) for SC, and only apply ratio deformation during canvas creation/image processing, not during display. Display cells should always be squares for pixel-perfect editing.

### 3. No Color Picker When Editing Canvas
**Current Behavior**: The ColorLibrary only shows when `pixelGrid.length === 0` (empty canvas state). Once a canvas/image is loaded, users cannot add new colors beyond the extracted palette.

**User Request**: Add a color picker widget to the editing interface so users can add custom colors to the palette.

### 4. Combined Ratio Not Adjustable
**Current Behavior**: The Combined Ratio is displayed as read-only (Lines 1019-1030). Changing it requires changing the stitch type or gauge data.

**User Request**: Make Combined Ratio adjustable via a slider/input, and sync the canvas display when it changes.

---

## Solution Architecture

### Phase 1: Add Canvas Size Selection Dialog After Cropping

**New Flow**:
1. User uploads image → Crop dialog opens
2. User crops image → **Canvas Size Dialog** opens
3. Dialog shows:
   - Cropped image dimensions (e.g., "Original: 800×600")
   - Suggested canvas size based on aspect ratio (e.g., "Suggested: 80×60 stitches")
   - Width/Height inputs (editable)
   - Lock aspect ratio toggle (default: locked to cropped image ratio)
   - Preview showing how image will map to grid
4. User confirms → Image is processed onto the chosen canvas size

**New Component**: `CanvasSizeDialog.tsx`

### Phase 2: Fix Cell Size to Be Always Square (SC = 1:1)

**Change**: Remove `combinedRatio` from cell height calculation. Cells are always square on screen. The ratio only affects:
- How the cropped image is processed (scaling during quantization)
- The suggested canvas dimensions
- Ruler aspect ratio information (informational only)

**Before**:
```typescript
const cellWidth = 14;
const cellHeight = cellWidth * combinedRatio; // Variable height
```

**After**:
```typescript
const cellSize = 14; // Always square for editing
// Ratio is applied during image processing, not display
```

### Phase 3: Add Color Picker to Editing Interface

**Add to Left Panel** (when `pixelGrid.length > 0`):
1. Custom color input (HTML5 color picker + hex input)
2. "Add to Palette" button that appends color to `colorPalette`
3. Show ColorLibrary as collapsible panel for quick access

**UI Placement**: Below the "Project Palette" section

### Phase 4: Make Combined Ratio Adjustable

**Replace Read-Only Display with Controls**:
1. Slider: Range 0.5 to 3.0, step 0.1
2. Input: Manual number entry
3. Preset buttons: 1:1 (SC), 1:1.5 (HDC), 1:2 (DC)

**Sync Behavior**: When ratio changes:
- Update the `combinedRatio` state
- Recalculate suggested canvas height if aspect lock is on
- Show info message: "Ratio affects canvas proportions, not cell display"

---

## Files to Modify/Create

| File | Action |
|------|--------|
| `src/components/pixel/CanvasSizeDialog.tsx` | **CREATE** - Dialog for canvas dimensions after cropping |
| `src/pages/PixelGenerator.tsx` | **MODIFY** - Integrate new dialog, fix cell sizing, add color picker, adjustable ratio |
| `src/components/pixel/ImageCropDialog.tsx` | **MODIFY** - Return cropped dimensions along with URL |

---

## Technical Details

### CanvasSizeDialog Interface
```typescript
interface CanvasSizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  croppedImageUrl: string;
  croppedWidth: number;   // Natural pixel dimensions
  croppedHeight: number;
  defaultRatio: number;   // Current combinedRatio
  onConfirm: (width: number, height: number) => void;
}
```

### Suggested Canvas Calculation
```typescript
// Based on cropped image aspect and target width
const aspectRatio = croppedWidth / croppedHeight;
const suggestedWidth = 60; // Default or user preference
const suggestedHeight = Math.round(suggestedWidth / aspectRatio);
```

### Fixed Cell Size Implementation
```typescript
// Always square cells for pixel editing
const cellSize = 14;

// In renderCell:
style={{ 
  width: cellSize, 
  height: cellSize,  // No ratio multiplication
  backgroundColor: cell.color,
  // ...borders
}}
```

### Color Picker UI
```typescript
<div className="space-y-3 border-t border-border/30 pt-4">
  <div className="flex items-center gap-2">
    <Palette className="w-4 h-4 text-muted-foreground" />
    <span className="text-sm font-medium">Add Custom Color</span>
  </div>
  <div className="flex gap-2">
    <input
      type="color"
      value={customColor}
      onChange={(e) => setCustomColor(e.target.value)}
      className="w-10 h-10 rounded-lg cursor-pointer"
    />
    <Input
      value={customColor}
      onChange={(e) => setCustomColor(e.target.value)}
      placeholder="#FFFFFF"
      className="flex-1"
    />
    <Button
      variant="outline"
      size="icon"
      onClick={() => addColorToPalette(customColor)}
    >
      <Plus className="w-4 h-4" />
    </Button>
  </div>
</div>
```

### Adjustable Combined Ratio
```typescript
const [manualRatio, setManualRatio] = useState(combinedRatio);
const [useManualRatio, setUseManualRatio] = useState(false);

const effectiveRatio = useManualRatio ? manualRatio : combinedRatio;

// UI:
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-sm">Combined Ratio</span>
    <Switch
      checked={useManualRatio}
      onCheckedChange={setUseManualRatio}
    />
  </div>
  {useManualRatio ? (
    <div className="flex gap-2">
      <Slider
        value={[manualRatio]}
        onValueChange={([v]) => setManualRatio(v)}
        min={0.5}
        max={3}
        step={0.1}
      />
      <Input
        type="number"
        value={manualRatio}
        onChange={(e) => setManualRatio(Number(e.target.value))}
        className="w-20"
      />
    </div>
  ) : (
    <p className="text-2xl font-semibold">{combinedRatio.toFixed(2)}</p>
  )}
</div>
```

---

## User Flow Summary

### Importing Image:
1. Click "Upload image" → Select file
2. **Crop Dialog**: Pan/zoom, select crop area, choose aspect preset
3. **Canvas Size Dialog**: See suggested dimensions, adjust if needed, preview
4. Confirm → Grid generated with exact canvas size, image fills entire grid

### Creating Empty Canvas:
1. Set Width/Height in settings
2. Optionally adjust Combined Ratio
3. Pick a fill color from Color Library or custom picker
4. Click "Create Canvas"

### Editing:
1. Fixed square cells (no distortion during editing)
2. Use color picker to add new colors beyond extracted palette
3. All palette colors available for drawing

---

## Expected Outcome

1. **Canvas size control**: Users choose exact grid dimensions after cropping
2. **Auto-suggestions**: System recommends dimensions matching cropped image aspect ratio
3. **Fixed cell display**: Cells are always square (14×14px) regardless of stitch ratio
4. **Color picker access**: Users can add any color to their palette while editing
5. **Adjustable ratio**: Combined Ratio can be manually overridden with slider/input
6. **Complete image display**: Imported images fill the entire canvas without clipping

