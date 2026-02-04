
# Swatch Lab Calculator Refactor Plan

## Issues Identified

### 1. Disconnected Save Systems
The "Save to My Yarn" button in Basic Gauge saves to a **local Zustand store** (`yarnLibrary` array in `useYarnCluesStore`), while the Yarn Gauge Vault uses Supabase. These are completely separate - nothing you save via "Save to My Yarn" appears in your cloud vault.

### 2. Missing Folder Selection
When saving yarn, the `YarnLibrarySaveModal` only asks for a name. It doesn't offer folder selection or use the cloud database.

### 3. Overlapping Calculator Logic
- Basic Gauge: Has shared "Swatch Dimensions" (width/height) with pre/post-wash stitch counts
- Advanced Calculator: Assumes 10x10cm pre-wash, only lets you enter post-wash dimensions
- User wants: Independent dimension fields under BOTH pre-wash AND post-wash sections

### 4. Project Planner Clarity
The planner uses post-wash gauge density, but this isn't communicated clearly.

### 5. Smart Yarn Calculator Single-Yarn Limitation
Currently supports one yarn only. User wants multiple yarn specs for held-together/doubled yarn scenarios.

---

## Solution Architecture

### Phase 1: Unify the Save System

**Action**: Delete `YarnLibrarySaveModal` and replace the "Save to My Yarn" button with a dialog that:
- Uses the Supabase `createEntry` mutation from `useYarnEntries`
- Shows folder picker (dropdown of available folders)
- Saves current gauge data to cloud

**Files Modified**:
- `src/pages/SwatchLab.tsx`: Remove YarnLibrarySaveModal, replace with integrated cloud save
- Delete `src/components/swatch/YarnLibrarySaveModal.tsx`

### Phase 2: Refactor Calculator UI with Dual Dimension Inputs

**New Unified Calculator Structure**:

```text
+--------------------------------------------+
|  PRE-WASH SWATCH                           |
|  +---------------+  +---------------+      |
|  | Width (cm)    |  | Height (cm)   |      |
|  +---------------+  +---------------+      |
|  +---------------+  +---------------+      |
|  | Stitch Count  |  | Row Count     |      |
|  +---------------+  +---------------+      |
+--------------------------------------------+
|  POST-WASH SWATCH                          |
|  +---------------+  +---------------+      |
|  | Width (cm)    |  | Height (cm)   |      |
|  +---------------+  +---------------+      |
|  +---------------+  +---------------+      |
|  | Stitch Count  |  | Row Count     |      |
|  +---------------+  +---------------+      |
+--------------------------------------------+
```

**Logic Changes**:
- Pre-wash dimensions: Reference swatch size (any value, not limited to 10cm)
- Post-wash dimensions: Same swatch after washing
- Shrinkage factor = Post-wash dimension / Pre-wash dimension
- No number restrictions on any input

**Files Modified**:
- `src/store/useYarnCluesStore.ts`: Update `SwatchData` interface to include both pre and post dimensions
- `src/pages/SwatchLab.tsx`: Consolidate into single calculator with clearer sections

### Phase 3: Clarify Project Planner Results

**Add explicit indicator**: Show whether results are for pre-wash or post-wash target.

**Logic**:
- Calculate both scenarios:
  - "Without compensation" = based on pre-wash gauge
  - "With shrinkage compensation" = adjusted for post-wash behavior

**Files Modified**:
- `src/pages/SwatchLab.tsx`: Update Project Planner section with clear labels

### Phase 4: Multi-Yarn Support in Smart Yarn Calculator

**New Feature**: Add yarn spec "slots" that can be combined.

```text
+--------------------------------------------+
| YARN A (Primary)                           |
| +---------------+  +---------------+       |
| | Grams/Ball    |  | Meters/Ball   |       |
| +---------------+  +---------------+       |
+--------------------------------------------+
| [+ Add Another Yarn]                       |
+--------------------------------------------+
| YARN B (Secondary) - optional              |
| +---------------+  +---------------+       |
| | Grams/Ball    |  | Meters/Ball   |       |
| +---------------+  +---------------+       |
| [Remove]                                   |
+--------------------------------------------+
```

**Calculation Logic**:
- When multiple yarns: Average the specs OR let user define ratio
- Total = sum of individual requirements

**Files Modified**:
- `src/components/swatch/SmartYarnCalculator.tsx`: Add multi-yarn support

---

## Technical Details

### Updated SwatchData Interface

```typescript
interface SwatchData {
  // Pre-wash swatch (independent dimensions)
  preWashWidth: number;      // cm
  preWashHeight: number;     // cm  
  stitchesPreWash: number;
  rowsPreWash: number;
  
  // Post-wash swatch (same swatch after washing)
  postWashWidth: number;     // cm
  postWashHeight: number;    // cm
  stitchesPostWash: number;
  rowsPostWash: number;
}
```

### Shrinkage Calculation

```typescript
// Independent width and height ratios
widthShrinkage = (preWashWidth - postWashWidth) / preWashWidth * 100;
heightShrinkage = (preWashHeight - postWashHeight) / preWashHeight * 100;

// Compensation factors for cast-on
widthFactor = preWashWidth / postWashWidth;
heightFactor = preWashHeight / postWashHeight;
```

### Cloud Save Integration

Replace the current save flow:

```typescript
// Old: Saves to local Zustand
saveToYarnLibrary(name);

// New: Saves to Supabase with folder selection
const { createEntry } = useYarnEntries(selectedFolderId);
createEntry.mutate({
  name: yarnName,
  folder_id: selectedFolderId,
  stitches_per_10cm: calculatedGauge,
  // ...other fields
});
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/store/useYarnCluesStore.ts` | Update SwatchData interface, fix gauge calculation |
| `src/pages/SwatchLab.tsx` | Consolidate calculators, integrate cloud save with folder picker |
| `src/components/swatch/SmartYarnCalculator.tsx` | Add multi-yarn support |
| `src/components/swatch/YarnLibrarySaveModal.tsx` | Delete (replaced by integrated dialog) |
| `src/components/swatch/AdvancedGaugeCalculator.tsx` | Merge into main calculator or refactor |

---

## Expected Outcome

1. **Single save path** - All saves go to cloud with folder selection
2. **Clear dimension inputs** - Each swatch state (pre/post wash) has its own width/height fields
3. **Explicit results** - Project Planner clearly shows whether results account for shrinkage
4. **Multi-yarn support** - Calculate requirements when using 2+ yarns held together
5. **No duplicate tabs** - Merge Basic and Advanced into one unified experience
