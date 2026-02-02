import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SwatchData, GaugeData } from './useYarnCluesStore';

// Yarn entry with folder organization
export interface YarnEntry {
  id: string;
  name: string;
  folderId: string | null; // null = root level
  swatchData: SwatchData;
  gaugeData: GaugeData;
  // New: Yarn calculator data
  metersPerBall?: number;
  gramsPerBall?: number;
  fiberContent?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

// Folder for organizing yarns
export interface YarnFolder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  color?: string;
  createdAt: number;
}

// Yarn calculation result
export interface YarnCalculation {
  targetMeters: number;
  metersPerBall: number;
  totalMetersWithBuffer: number;
  ballsNeeded: number;
  bufferPercentage: number;
}

interface YarnVaultStore {
  // Data
  yarns: YarnEntry[];
  folders: YarnFolder[];
  searchQuery: string;
  selectedFolderId: string | null;
  
  // Yarn CRUD
  addYarn: (yarn: Omit<YarnEntry, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateYarn: (id: string, updates: Partial<YarnEntry>) => void;
  deleteYarn: (id: string) => void;
  getYarn: (id: string) => YarnEntry | undefined;
  
  // Folder CRUD
  addFolder: (name: string, parentId?: string | null, color?: string) => string;
  updateFolder: (id: string, updates: Partial<YarnFolder>) => void;
  deleteFolder: (id: string, deleteContents?: boolean) => void;
  
  // Navigation & Search
  setSearchQuery: (query: string) => void;
  setSelectedFolder: (folderId: string | null) => void;
  
  // Filtered getters
  getFilteredYarns: () => YarnEntry[];
  getFolderPath: (folderId: string | null) => YarnFolder[];
  getSubfolders: (parentId: string | null) => YarnFolder[];
  getYarnsInFolder: (folderId: string | null) => YarnEntry[];
  
  // Yarn Calculator
  calculateBallsNeeded: (targetMeters: number, metersPerBall: number, bufferPercent?: number) => YarnCalculation;
}

export const useYarnVaultStore = create<YarnVaultStore>()(
  persist(
    (set, get) => ({
      yarns: [],
      folders: [],
      searchQuery: '',
      selectedFolderId: null,

      addYarn: (yarnData) => {
        const id = crypto.randomUUID();
        const now = Date.now();
        const newYarn: YarnEntry = {
          ...yarnData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ yarns: [...state.yarns, newYarn] }));
        return id;
      },

      updateYarn: (id, updates) => {
        set((state) => ({
          yarns: state.yarns.map((yarn) =>
            yarn.id === id
              ? { ...yarn, ...updates, updatedAt: Date.now() }
              : yarn
          ),
        }));
      },

      deleteYarn: (id) => {
        set((state) => ({
          yarns: state.yarns.filter((yarn) => yarn.id !== id),
        }));
      },

      getYarn: (id) => {
        return get().yarns.find((yarn) => yarn.id === id);
      },

      addFolder: (name, parentId = null, color) => {
        const id = crypto.randomUUID();
        const newFolder: YarnFolder = {
          id,
          name,
          parentId,
          color,
          createdAt: Date.now(),
        };
        set((state) => ({ folders: [...state.folders, newFolder] }));
        return id;
      },

      updateFolder: (id, updates) => {
        set((state) => ({
          folders: state.folders.map((folder) =>
            folder.id === id ? { ...folder, ...updates } : folder
          ),
        }));
      },

      deleteFolder: (id, deleteContents = false) => {
        const { yarns, folders } = get();
        
        // Get all descendant folder IDs
        const getDescendantIds = (parentId: string): string[] => {
          const children = folders.filter((f) => f.parentId === parentId);
          return children.flatMap((child) => [child.id, ...getDescendantIds(child.id)]);
        };
        
        const folderIdsToDelete = [id, ...getDescendantIds(id)];
        
        if (deleteContents) {
          // Delete folder and all contents
          set((state) => ({
            folders: state.folders.filter((f) => !folderIdsToDelete.includes(f.id)),
            yarns: state.yarns.filter((y) => !folderIdsToDelete.includes(y.folderId ?? '')),
          }));
        } else {
          // Move contents to parent folder, then delete folder
          const deletedFolder = folders.find((f) => f.id === id);
          const parentId = deletedFolder?.parentId ?? null;
          
          set((state) => ({
            folders: state.folders.filter((f) => !folderIdsToDelete.includes(f.id)),
            yarns: state.yarns.map((y) =>
              folderIdsToDelete.includes(y.folderId ?? '')
                ? { ...y, folderId: parentId }
                : y
            ),
          }));
        }
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSelectedFolder: (folderId) => {
        set({ selectedFolderId: folderId });
      },

      getFilteredYarns: () => {
        const { yarns, searchQuery, selectedFolderId } = get();
        
        let filtered = yarns;
        
        // Filter by folder
        if (selectedFolderId !== null) {
          filtered = filtered.filter((y) => y.folderId === selectedFolderId);
        }
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (y) =>
              y.name.toLowerCase().includes(query) ||
              y.fiberContent?.toLowerCase().includes(query) ||
              y.notes?.toLowerCase().includes(query)
          );
        }
        
        return filtered;
      },

      getFolderPath: (folderId) => {
        const { folders } = get();
        const path: YarnFolder[] = [];
        let currentId = folderId;
        
        while (currentId) {
          const folder = folders.find((f) => f.id === currentId);
          if (folder) {
            path.unshift(folder);
            currentId = folder.parentId;
          } else {
            break;
          }
        }
        
        return path;
      },

      getSubfolders: (parentId) => {
        return get().folders.filter((f) => f.parentId === parentId);
      },

      getYarnsInFolder: (folderId) => {
        return get().yarns.filter((y) => y.folderId === folderId);
      },

      calculateBallsNeeded: (targetMeters, metersPerBall, bufferPercent = 10) => {
        const totalMetersWithBuffer = targetMeters * (1 + bufferPercent / 100);
        const ballsNeeded = Math.ceil(totalMetersWithBuffer / metersPerBall);
        
        return {
          targetMeters,
          metersPerBall,
          totalMetersWithBuffer,
          ballsNeeded,
          bufferPercentage: bufferPercent,
        };
      },
    }),
    {
      name: 'yarn-vault-storage',
    }
  )
);
