

# Swatch Lab + Pixel Generator Fix Plan

## Part 1: Smart Yarn Calculator Fix

### Issue
The current multi-yarn calculation splits the target requirements evenly across all yarns (`reqGrams / yarnCount`). This is incorrect - when holding 2 yarns together, you need the **full target length/weight of EACH yarn**, not half of each.

**Example**: If project needs 500m total and you're using 2 yarns held together, you need 500m of Yarn A AND 500m of Yarn B (not 250m each).

### Solution
Change the calculation logic so each yarn independently calculates based on the **full** target requirement:

```
Current (wrong): Yarn A = 500m / 2 = 250m, Yarn B = 250m
Fixed (correct): Yarn A = 500m, Yarn B = 500m
```

### File Changed
- `src/components/swatch/SmartYarnCalculator.tsx`: Remove the `/yarnCount` division in multi-yarn mode

---

## Part 2: Pixel Generator Enhancements

### 2.1 Image Cropping After Upload

**New Component**: `ImageCropDialog.tsx`
- Uses `react-zoom-pan-pinch` (already installed) for pan/zoom
- Manual crop selection via drag handles
- Preset aspect ratio buttons: Free, 1:1, 4:3, 16:9, 3:4, Portrait, Landscape
- Apply/Cancel buttons

**Flow Change**:
1. User clicks "Upload image"
2. After file selection, cropping dialog opens
3. User adjusts crop area (drag/zoom/preset buttons)
4. User clicks "Apply" - cropped image is passed to the existing `processImage` function

### 2.2 Custom Height Input

**Current**: Only "Target Width" input, height auto-calculated from stitch ratio
**New**: Add separate "Target Height" input option with a toggle

- When "Lock Ratio" is ON (default): Height = Width / stitchRatio (current behavior)
- When "Lock Ratio" is OFF: User can enter both width and height independently

**UI Change**: Add a lock/unlock toggle next to dimensions

### 2.3 Preview Zoom Controls

**Current**: Basic overflow-scroll preview
**New**: Wrap preview in zoom/pan controls

- Add zoom slider (10% - 400%)
- Add "Fit to View" button
- Pan on drag (already have InfiniteCanvas, but not used in main grid area)

### 2.4 Color Library for Empty Canvas Mode

**Current**: When no image uploaded, shows "Upload an image or create an empty canvas" with only a create button
**New**: Show a color palette picker

- Display a curated color library (common yarn colors)
- Categories: Neutrals, Pastels, Brights, Earth Tones
- Allow user to select a base fill color before creating empty canvas
- Also show the Yarn Stash palette if colors are saved

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/swatch/SmartYarnCalculator.tsx` | Fix multi-yarn calculation logic |
| `src/components/pixel/ImageCropDialog.tsx` | NEW - Image cropping dialog component |
| `src/components/pixel/ColorLibrary.tsx` | NEW - Default color palette component |
| `src/pages/PixelGenerator.tsx` | Integrate cropping, add height input, add preview zoom, add color library |

---

## Technical Details

### SmartYarnCalculator Fix

```typescript
// BEFORE (line 145-157):
const yarnGrams = (reqGrams / yarnCount) * bufferMultiplier;

// AFTER:
const yarnGrams = reqGrams * bufferMultiplier; // Full requirement per yarn
```

### ImageCropDialog Implementation

```typescript
interface ImageCropDialogProps {
  imageUrl: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCropComplete: (croppedImageUrl: string) => void;
}

// Preset ratios
const ASPECT_PRESETS = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: '16:9', value: 16/9 },
];
```

### Color Library Structure

```typescript
interface ColorCategory {
  name: string;
  colors: { hex: string; name: string }[];
}

const COLOR_LIBRARY: ColorCategory[] = [
  {
    name: 'Neutrals',
    colors: [
      { hex: '#FFFFFF', name: 'White' },
      { hex: '#F5F5DC', name: 'Beige' },
      { hex: '#D3D3D3', name: 'Light Grey' },
      // ...
    ]
  },
  // Pastels, Brights, Earth Tones...
];
```

### PixelGenerator Dimension Changes

```typescript
// New state
const [lockAspectRatio, setLockAspectRatio] = useState(true);
const [customHeight, setCustomHeight] = useState(customGridHeight);

// Calculated height respects lock
const targetHeight = lockAspectRatio 
  ? Math.round(customGridWidth / combinedRatio)
  : customHeight;
```

---

## Expected Outcome

1. **Multi-yarn calculator**: Each yarn shows the full target requirement, total balls is the sum across all yarns
2. **Image cropping**: Users can select a specific region of their image before conversion
3. **Flexible dimensions**: Users can override the auto-calculated height when needed
4. **Preview zoom**: Large patterns are easier to navigate
5. **Color library**: Empty canvas creation is more intuitive with preset colors

