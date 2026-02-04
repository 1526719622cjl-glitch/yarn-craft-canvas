# Pixel Generator Enhancement Plan

## ✅ Completed

All fixes from the plan have been implemented:

1. **Cell Size Responds to Stitch Type** - `cellWidth = 14`, `cellHeight = cellWidth * stitchRatio`
2. **Grid Lines Visible on All Cells** - All cells have 1px borders, major 10×10 lines have 2px primary-colored borders
3. **Ruler Numbers Aligned with Major Lines** - Updated Ruler component with tick lines connecting to grid
4. **Combined Ratio Section Removed** - State and UI completely deleted
5. **Image Import Uses Exact Dialog Dimensions** - Added `importedDimensions` state, used directly in `processImage`

## Summary of Changes

### Files Modified
- `src/pages/PixelGenerator.tsx`

### Key Changes
- Replaced `cellSize = 14` with `cellWidth = 14` and `cellHeight = cellWidth * stitchRatio`
- Updated Ruler component to accept `cellWidth` and `cellHeight` props separately
- Added tick lines to ruler that connect to major grid lines
- Removed `useManualRatio` and `manualRatio` state variables
- Removed the "Combined Ratio" frosted-panel UI section
- Added `importedDimensions` state to track dimensions from CanvasSizeDialog
- Updated `processImage` to use imported dimensions directly

### Stitch Ratios
- SC (Single Crochet): 1:1 → 14×14 cells
- HDC (Half Double Crochet): 1:1.5 → 14×21 cells  
- DC (Double Crochet): 1:2 → 14×28 cells
