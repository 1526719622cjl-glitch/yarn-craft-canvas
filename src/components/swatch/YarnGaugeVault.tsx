import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FolderOpen, 
  FolderPlus, 
  Search, 
  ChevronRight, 
  Home,
  Trash2,
  Plus,
  Package,
  ChevronDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useYarnFolders, useYarnEntries, YarnEntry, YarnWeight, YarnStatus } from '@/hooks/useYarnVault';
import { useYarnCluesStore } from '@/store/useYarnCluesStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Link } from 'react-router-dom';

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const WEIGHT_LABELS: Record<YarnWeight, string> = {
  'lace': 'Lace',
  'fingering': 'Fingering',
  'sport': 'Sport',
  'dk': 'DK',
  'worsted': 'Worsted',
  'aran': 'Aran',
  'bulky': 'Bulky',
  'super_bulky': 'Super Bulky',
};

const STATUS_COLORS: Record<YarnStatus, string> = {
  'new': 'bg-green-500/20 text-green-700',
  'in_use': 'bg-blue-500/20 text-blue-700',
  'scraps': 'bg-yellow-500/20 text-yellow-700',
  'finished': 'bg-gray-500/20 text-gray-600',
  'wishlist': 'bg-purple-500/20 text-purple-700',
};

interface YarnGaugeVaultProps {
  onLoadYarn?: (yarn: YarnEntry) => void;
  compact?: boolean;
}

export function YarnGaugeVault({ onLoadYarn, compact = false }: YarnGaugeVaultProps) {
  const { user } = useAuth();
  const { swatchData, gaugeData, setSwatchData } = useYarnCluesStore();
  
  // Supabase hooks
  const { folders, isLoading: foldersLoading, createFolder, deleteFolder } = useYarnFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { entries, isLoading: entriesLoading, createEntry, deleteEntry } = useYarnEntries(selectedFolderId, searchQuery);
  
  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [yarnDialogOpen, setYarnDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isVaultOpen, setIsVaultOpen] = useState(!compact);
  
  // New yarn form state
  const [newYarn, setNewYarn] = useState({
    name: '',
    brand: '',
    color_code: '',
    fiber_content: '',
    weight: '' as YarnWeight | '',
    notes: '',
  });

  // Get current folder path for breadcrumb
  const folderPath = useMemo(() => {
    const path: typeof folders = [];
    let currentId = selectedFolderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parent_id;
      } else {
        break;
      }
    }
    return path;
  }, [selectedFolderId, folders]);

  // Get subfolders of current folder
  const subfolders = useMemo(() => {
    return folders.filter(f => f.parent_id === selectedFolderId);
  }, [folders, selectedFolderId]);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder.mutate({
        name: newFolderName.trim(),
        parent_id: selectedFolderId,
      });
      setNewFolderName('');
      setFolderDialogOpen(false);
    }
  };

  const handleSaveYarn = () => {
    if (!newYarn.name.trim() || !swatchData || !gaugeData) return;
    
    createEntry.mutate({
      name: newYarn.name.trim(),
      brand: newYarn.brand.trim() || null,
      color_code: newYarn.color_code.trim() || null,
      fiber_content: newYarn.fiber_content.trim() || null,
      weight: (newYarn.weight || null) as YarnWeight | null,
      status: 'new' as YarnStatus,
      folder_id: selectedFolderId,
      stitches_per_10cm: gaugeData.stitchDensity * 10,
      rows_per_10cm: gaugeData.rowDensity * 10,
      post_wash_width_cm: swatchData.swatchWidth,
      post_wash_height_cm: swatchData.swatchHeight,
      meters_per_ball: null,
      grams_per_ball: null,
      balls_in_stock: 0,
      notes: newYarn.notes.trim() || null,
    });
    
    setNewYarn({
      name: '',
      brand: '',
      color_code: '',
      fiber_content: '',
      weight: '',
      notes: '',
    });
    setYarnDialogOpen(false);
  };

  const handleLoadYarn = (yarn: YarnEntry) => {
    // Load yarn data into swatch calculator
    const stitchDensity = yarn.stitches_per_10cm ? yarn.stitches_per_10cm / 10 : gaugeData.stitchDensity;
    const rowDensity = yarn.rows_per_10cm ? yarn.rows_per_10cm / 10 : gaugeData.rowDensity;
    
    setSwatchData({
      swatchWidth: yarn.post_wash_width_cm || 10,
      swatchHeight: yarn.post_wash_height_cm || 10,
      stitchesPostWash: Math.round(stitchDensity * (yarn.post_wash_width_cm || 10)),
      rowsPostWash: Math.round(rowDensity * (yarn.post_wash_height_cm || 10)),
    });
    
    onLoadYarn?.(yarn);
  };

  const handleNavigateToFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setSearchQuery('');
  };

  // Not logged in state
  if (!user) {
    return (
      <motion.div variants={itemVariants} className="glass-card p-6">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">Sign in to access your Yarn & Gauge Vault</p>
          <Link to="/auth">
            <Button className="rounded-xl">Sign In</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  const isLoading = foldersLoading || entriesLoading;

  const vaultContent = (
    <>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search yarns by name, brand, fiber..."
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
        {folderPath.map((folder) => (
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Folders Grid */}
          {subfolders.length > 0 && !searchQuery && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {subfolders.map((folder) => (
                <motion.button
                  key={folder.id}
                  onClick={() => handleNavigateToFolder(folder.id)}
                  className="frosted-panel flex items-center gap-2 p-3 text-left group hover:bg-muted/30 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium text-sm truncate">{folder.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder.mutate(folder.id);
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
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {entries.map((yarn) => (
                  <motion.div
                    key={yarn.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="frosted-panel space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package className="w-4 h-4 text-primary shrink-0" />
                        <h3 className="font-medium text-foreground truncate">{yarn.name}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        {yarn.weight && (
                          <Badge variant="secondary" className="text-xs">
                            {WEIGHT_LABELS[yarn.weight]}
                          </Badge>
                        )}
                        {yarn.status && (
                          <Badge className={`text-xs ${STATUS_COLORS[yarn.status]}`}>
                            {yarn.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      {yarn.brand && <p className="truncate">Brand: {yarn.brand}</p>}
                      {yarn.fiber_content && <p className="truncate">Fiber: {yarn.fiber_content}</p>}
                      {(yarn.stitches_per_10cm || yarn.rows_per_10cm) && (
                        <p>
                          Gauge: {yarn.stitches_per_10cm ?? '-'} st × {yarn.rows_per_10cm ?? '-'} rows / 10cm
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadYarn(yarn)}
                        className="flex-1 rounded-xl"
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteEntry.mutate(yarn.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
        </>
      )}
    </>
  );

  return (
    <motion.div variants={itemVariants} className="glass-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Collapsible open={isVaultOpen} onOpenChange={setIsVaultOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-yarn-lavender/30 flex items-center justify-center">
                <FolderOpen className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-lg font-medium">Yarn & Gauge Vault</h2>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isVaultOpen ? 'rotate-180' : ''}`} />
              <Badge variant="secondary" className="ml-2">{entries.length} yarns</Badge>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-4 mt-4">
            {vaultContent}
          </CollapsibleContent>
        </Collapsible>

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
                  Organize your yarns (e.g., "Summer Cottons", "Winter Wools").
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., Merino Collection, Project Sweater"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFolderDialogOpen(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button onClick={handleCreateFolder} disabled={createFolder.isPending} className="rounded-2xl">
                  {createFolder.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle>Save Current Gauge</DialogTitle>
                <DialogDescription>
                  Save the current swatch & gauge data to your library.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="yarn-name">Yarn Name *</Label>
                  <Input
                    id="yarn-name"
                    value={newYarn.name}
                    onChange={(e) => setNewYarn(p => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Malabrigo Rios - Azul Profundo"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yarn-brand">Brand</Label>
                    <Input
                      id="yarn-brand"
                      value={newYarn.brand}
                      onChange={(e) => setNewYarn(p => ({ ...p, brand: e.target.value }))}
                      placeholder="Malabrigo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yarn-color">Color Code</Label>
                    <Input
                      id="yarn-color"
                      value={newYarn.color_code}
                      onChange={(e) => setNewYarn(p => ({ ...p, color_code: e.target.value }))}
                      placeholder="026"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="yarn-fiber">Fiber Content</Label>
                    <Input
                      id="yarn-fiber"
                      value={newYarn.fiber_content}
                      onChange={(e) => setNewYarn(p => ({ ...p, fiber_content: e.target.value }))}
                      placeholder="100% Merino"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Weight</Label>
                    <Select 
                      value={newYarn.weight} 
                      onValueChange={(v) => setNewYarn(p => ({ ...p, weight: v as YarnWeight }))}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WEIGHT_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yarn-notes">Notes</Label>
                  <Input
                    id="yarn-notes"
                    value={newYarn.notes}
                    onChange={(e) => setNewYarn(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Great for cables, slightly splitty..."
                  />
                </div>

                {/* Current gauge preview */}
                <div className="frosted-panel">
                  <p className="text-xs text-muted-foreground mb-2">Current Gauge (will be saved):</p>
                  <p className="text-sm font-medium">
                    {gaugeData?.stitchDensity?.toFixed(1) ?? '0'} st/cm × {gaugeData?.rowDensity?.toFixed(1) ?? '0'} rows/cm
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Swatch: {swatchData?.swatchWidth ?? 10} × {swatchData?.swatchHeight ?? 10} cm
                  </p>
                </div>

                {selectedFolderId && folderPath.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Will be saved to: {folderPath.map(f => f.name).join(' / ')}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYarnDialogOpen(false)} className="rounded-2xl">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveYarn} 
                  disabled={!newYarn.name.trim() || createEntry.isPending} 
                  className="rounded-2xl"
                >
                  {createEntry.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Show vault content if not using collapsible */}
      {!compact && !isVaultOpen && null}
    </motion.div>
  );
}