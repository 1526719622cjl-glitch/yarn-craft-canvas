import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, 
  FolderPlus, 
  Search, 
  ChevronRight, 
  Home,
  Trash2,
  Edit2,
  Plus,
  Package
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useYarnVaultStore, YarnEntry, YarnFolder } from '@/store/yarnVaultStore';
import { useYarnCluesStore, SwatchData, GaugeData } from '@/store/useYarnCluesStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const folderColors = [
  { name: 'Default', value: undefined },
  { name: 'Rose', value: 'yarn-rose' },
  { name: 'Honey', value: 'yarn-honey' },
  { name: 'Sage', value: 'yarn-sage' },
  { name: 'Sky', value: 'yarn-sky' },
  { name: 'Lavender', value: 'yarn-lavender' },
];

export function YarnVault() {
  const { swatchData, gaugeData, setSwatchData } = useYarnCluesStore();
  const {
    yarns,
    folders,
    searchQuery,
    selectedFolderId,
    addYarn,
    deleteYarn,
    addFolder,
    deleteFolder,
    setSearchQuery,
    setSelectedFolder,
    getSubfolders,
    getYarnsInFolder,
    getFolderPath,
    getFilteredYarns,
  } = useYarnVaultStore();

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<string | undefined>(undefined);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  
  const [newYarnName, setNewYarnName] = useState('');
  const [newYarnNotes, setNewYarnNotes] = useState('');
  const [yarnDialogOpen, setYarnDialogOpen] = useState(false);

  const currentSubfolders = getSubfolders(selectedFolderId);
  const currentYarns = searchQuery ? getFilteredYarns() : getYarnsInFolder(selectedFolderId);
  const breadcrumbPath = getFolderPath(selectedFolderId);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), selectedFolderId, newFolderColor);
      setNewFolderName('');
      setNewFolderColor(undefined);
      setFolderDialogOpen(false);
    }
  };

  const handleSaveYarn = () => {
    if (newYarnName.trim() && swatchData && gaugeData) {
      addYarn({
        name: newYarnName.trim(),
        folderId: selectedFolderId,
        swatchData: { ...swatchData },
        gaugeData: { ...gaugeData },
        notes: newYarnNotes.trim() || undefined,
      });
      setNewYarnName('');
      setNewYarnNotes('');
      setYarnDialogOpen(false);
    }
  };

  const handleLoadYarn = (yarn: YarnEntry) => {
    setSwatchData(yarn.swatchData);
  };

  const handleNavigateToFolder = (folderId: string | null) => {
    setSelectedFolder(folderId);
    setSearchQuery('');
  };

  return (
    <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
            <FolderOpen className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-lg font-medium">Yarn Vault</h2>
        </div>

        <div className="flex gap-2">
          {/* New Folder Dialog */}
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl soft-press">
                <FolderPlus className="w-4 h-4 mr-1" />
                Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Organize your yarns into folders (e.g., by brand or project).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., Malabrigo, Project Sweater"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color (Optional)</Label>
                  <div className="flex gap-2 flex-wrap">
                    {folderColors.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setNewFolderColor(color.value)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          newFolderColor === color.value
                            ? 'border-primary scale-110'
                            : 'border-transparent'
                        } ${color.value ? `bg-${color.value}/50` : 'bg-muted'}`}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} className="rounded-2xl">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Save Yarn Dialog */}
          <Dialog open={yarnDialogOpen} onOpenChange={setYarnDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl soft-press">
                <Plus className="w-4 h-4 mr-1" />
                Save Yarn
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Save Current Gauge</DialogTitle>
                <DialogDescription>
                  Save the current swatch data to your Yarn Vault.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="yarn-name">Yarn Name</Label>
                  <Input
                    id="yarn-name"
                    value={newYarnName}
                    onChange={(e) => setNewYarnName(e.target.value)}
                    placeholder="e.g., My Blue Merino"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yarn-notes">Notes (Optional)</Label>
                  <Input
                    id="yarn-notes"
                    value={newYarnNotes}
                    onChange={(e) => setNewYarnNotes(e.target.value)}
                    placeholder="e.g., Great for cables, slightly splitty"
                  />
                </div>
                {selectedFolderId && (
                  <p className="text-sm text-muted-foreground">
                    Will be saved to: {breadcrumbPath.map(f => f.name).join(' / ') || 'Root'}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYarnDialogOpen(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={handleSaveYarn} className="rounded-2xl">
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search yarns..."
          className="pl-10"
        />
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-1 text-sm overflow-x-auto py-2">
        <button
          onClick={() => handleNavigateToFolder(null)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors ${
            selectedFolderId === null ? 'text-primary font-medium' : 'text-muted-foreground'
          }`}
        >
          <Home className="w-4 h-4" />
          Root
        </button>
        {breadcrumbPath.map((folder) => (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <button
              onClick={() => handleNavigateToFolder(folder.id)}
              className={`px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors ${
                selectedFolderId === folder.id ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Folders Grid */}
      {currentSubfolders.length > 0 && !searchQuery && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {currentSubfolders.map((folder) => (
            <motion.button
              key={folder.id}
              onClick={() => handleNavigateToFolder(folder.id)}
              className={`frosted-panel flex items-center gap-2 p-3 text-left group hover:bg-muted/30 transition-colors ${
                folder.color ? `border-l-4 border-${folder.color}` : ''
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FolderOpen className={`w-5 h-5 ${folder.color ? `text-${folder.color}` : 'text-muted-foreground'}`} />
              <span className="font-medium text-sm truncate">{folder.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFolder(folder.id, false);
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.button>
          ))}
        </div>
      )}

      {/* Yarns Grid */}
      {currentYarns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {currentYarns.map((yarn) => (
              <motion.div
                key={yarn.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="frosted-panel space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-foreground truncate">{yarn.name}</h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteYarn(yarn.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Density: {yarn.gaugeData?.stitchDensity?.toFixed(1) ?? '0'} st/cm × {yarn.gaugeData?.rowDensity?.toFixed(1) ?? '0'} rows/cm</p>
                  <p>Ratio: {yarn.gaugeData?.gaugeRatio?.toFixed(2) ?? '1.00'}</p>
                  {yarn.notes && (
                    <p className="text-xs italic truncate">{yarn.notes}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadYarn(yarn)}
                  className="w-full rounded-xl"
                >
                  Load
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {searchQuery 
              ? 'No yarns found matching your search' 
              : 'No yarns in this folder yet'}
          </p>
          <p className="text-xs mt-1">
            Save your current gauge to add it here
          </p>
        </div>
      )}
    </motion.div>
  );
}
