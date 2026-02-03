import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useYarnFolders, useYarnEntries, YarnEntry, YarnWeight, YarnStatus } from '@/hooks/useYarnVault';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  FolderPlus,
  Plus,
  Folder,
  ChevronRight,
  Package,
  Trash2,
  Edit,
  Grid3X3,
  List,
  Filter,
  Loader2,
} from 'lucide-react';
import { Navigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const YARN_WEIGHTS: { value: YarnWeight; label: string }[] = [
  { value: 'lace', label: 'Lace' },
  { value: 'fingering', label: 'Fingering' },
  { value: 'sport', label: 'Sport' },
  { value: 'dk', label: 'DK' },
  { value: 'worsted', label: 'Worsted' },
  { value: 'aran', label: 'Aran' },
  { value: 'bulky', label: 'Bulky' },
  { value: 'super_bulky', label: 'Super Bulky' },
];

const YARN_STATUSES: { value: YarnStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-yarn-sage' },
  { value: 'in_use', label: 'In Use', color: 'bg-yarn-sky' },
  { value: 'scraps', label: 'Scraps', color: 'bg-yarn-honey' },
  { value: 'finished', label: 'Finished', color: 'bg-muted' },
  { value: 'wishlist', label: 'Wishlist', color: 'bg-yarn-lavender' },
];

export default function YarnVault() {
  const { user, loading: authLoading } = useAuth();
  const { folders, createFolder, deleteFolder, isLoading: foldersLoading } = useYarnFolders();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [weightFilter, setWeightFilter] = useState<YarnWeight | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [newFolderName, setNewFolderName] = useState('');
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [yarnDialogOpen, setYarnDialogOpen] = useState(false);

  const { entries, createEntry, deleteEntry, isLoading: entriesLoading } = useYarnEntries(
    selectedFolderId,
    searchQuery
  );

  // New yarn form state
  const [newYarn, setNewYarn] = useState<Partial<YarnEntry>>({
    name: '',
    brand: '',
    color_code: '',
    fiber_content: '',
    weight: null,
    status: 'new',
    stitches_per_10cm: null,
    rows_per_10cm: null,
    post_wash_width_cm: null,
    post_wash_height_cm: null,
    meters_per_ball: null,
    grams_per_ball: null,
    balls_in_stock: 0,
    notes: '',
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder.mutate({ name: newFolderName, parent_id: selectedFolderId });
    setNewFolderName('');
    setFolderDialogOpen(false);
  };

  const handleCreateYarn = () => {
    if (!newYarn.name?.trim()) return;
    createEntry.mutate({
      ...newYarn,
      folder_id: selectedFolderId,
    } as Omit<YarnEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>);
    setNewYarn({
      name: '',
      brand: '',
      color_code: '',
      fiber_content: '',
      weight: null,
      status: 'new',
      stitches_per_10cm: null,
      rows_per_10cm: null,
      post_wash_width_cm: null,
      post_wash_height_cm: null,
      meters_per_ball: null,
      grams_per_ball: null,
      balls_in_stock: 0,
      notes: '',
    });
    setYarnDialogOpen(false);
  };

  const filteredEntries = weightFilter === 'all' 
    ? entries 
    : entries.filter(e => e.weight === weightFilter);

  const folderPath = selectedFolderId 
    ? [{ id: null, name: 'All Yarns' }, ...getFolderPath(folders, selectedFolderId)]
    : [{ id: null, name: 'All Yarns' }];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-7xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-yarn-lavender/30 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-semibold text-foreground">Yarn Vault</h1>
            <p className="text-muted-foreground">Your personal yarn library</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl soft-press">
                <FolderPlus className="w-4 h-4 mr-2" />
                New Folder
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Create Folder</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Folder Name</Label>
                  <Input
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., In Stock, Wishlist"
                    className="input-glass"
                  />
                </div>
                <Button onClick={handleCreateFolder} className="w-full rounded-xl">
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={yarnDialogOpen} onOpenChange={setYarnDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl soft-press">
                <Plus className="w-4 h-4 mr-2" />
                Add Yarn
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Yarn</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="basic" className="pt-4">
                <TabsList className="grid w-full grid-cols-3 rounded-xl">
                  <TabsTrigger value="basic" className="rounded-lg">Basic Info</TabsTrigger>
                  <TabsTrigger value="gauge" className="rounded-lg">Gauge Data</TabsTrigger>
                  <TabsTrigger value="specs" className="rounded-lg">Yarn Specs</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 col-span-2">
                      <Label>Yarn Name *</Label>
                      <Input
                        value={newYarn.name}
                        onChange={(e) => setNewYarn({ ...newYarn, name: e.target.value })}
                        placeholder="e.g., Malabrigo Rios"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Input
                        value={newYarn.brand ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, brand: e.target.value })}
                        placeholder="e.g., Malabrigo"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color Code</Label>
                      <Input
                        value={newYarn.color_code ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, color_code: e.target.value })}
                        placeholder="e.g., #412 Teal"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fiber Content</Label>
                      <Input
                        value={newYarn.fiber_content ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, fiber_content: e.target.value })}
                        placeholder="e.g., 100% Merino Wool"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight</Label>
                      <Select
                        value={newYarn.weight ?? ''}
                        onValueChange={(v) => setNewYarn({ ...newYarn, weight: v as YarnWeight })}
                      >
                        <SelectTrigger className="input-glass">
                          <SelectValue placeholder="Select weight" />
                        </SelectTrigger>
                        <SelectContent>
                          {YARN_WEIGHTS.map((w) => (
                            <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={newYarn.status}
                        onValueChange={(v) => setNewYarn({ ...newYarn, status: v as YarnStatus })}
                      >
                        <SelectTrigger className="input-glass">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {YARN_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Balls in Stock</Label>
                      <Input
                        type="number"
                        value={newYarn.balls_in_stock ?? 0}
                        onChange={(e) => setNewYarn({ ...newYarn, balls_in_stock: Number(e.target.value) })}
                        className="input-glass"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="gauge" className="space-y-4 pt-4">
                  <p className="text-sm text-muted-foreground">
                    Enter gauge data from your swatch (in 10cm x 10cm)
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Stitches per 10cm</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={newYarn.stitches_per_10cm ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, stitches_per_10cm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 20"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rows per 10cm</Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={newYarn.rows_per_10cm ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, rows_per_10cm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 28"
                        className="input-glass"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-yarn-honey/20 rounded-2xl">
                    <h4 className="font-medium mb-2">Post-Wash Dimensions</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Measure your 10x10cm swatch after washing
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Width (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={newYarn.post_wash_width_cm ?? ''}
                          onChange={(e) => setNewYarn({ ...newYarn, post_wash_width_cm: e.target.value ? Number(e.target.value) : null })}
                          placeholder="e.g., 9.5"
                          className="input-glass"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Height (cm)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={newYarn.post_wash_height_cm ?? ''}
                          onChange={(e) => setNewYarn({ ...newYarn, post_wash_height_cm: e.target.value ? Number(e.target.value) : null })}
                          placeholder="e.g., 10.2"
                          className="input-glass"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="specs" className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Meters per Ball</Label>
                      <Input
                        type="number"
                        value={newYarn.meters_per_ball ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, meters_per_ball: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 150"
                        className="input-glass"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Grams per Ball</Label>
                      <Input
                        type="number"
                        value={newYarn.grams_per_ball ?? ''}
                        onChange={(e) => setNewYarn({ ...newYarn, grams_per_ball: e.target.value ? Number(e.target.value) : null })}
                        placeholder="e.g., 50"
                        className="input-glass"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Input
                      value={newYarn.notes ?? ''}
                      onChange={(e) => setNewYarn({ ...newYarn, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      className="input-glass"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <Button onClick={handleCreateYarn} className="w-full rounded-xl mt-4" disabled={!newYarn.name?.trim()}>
                Add to Library
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Breadcrumb */}
      <motion.div variants={itemVariants} className="flex items-center gap-2 text-sm">
        {folderPath.map((folder, idx) => (
          <div key={folder.id ?? 'root'} className="flex items-center gap-2">
            {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <button
              onClick={() => setSelectedFolderId(folder.id)}
              className={`hover:text-primary transition-colors ${
                folder.id === selectedFolderId ? 'text-primary font-medium' : 'text-muted-foreground'
              }`}
            >
              {folder.name}
            </button>
          </div>
        ))}
      </motion.div>

      {/* Search & Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, brand, color, fiber..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-glass pl-10"
          />
        </div>
        <Select value={weightFilter} onValueChange={(v) => setWeightFilter(v as YarnWeight | 'all')}>
          <SelectTrigger className="w-[150px] input-glass">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter weight" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Weights</SelectItem>
            {YARN_WEIGHTS.map((w) => (
              <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-xl border border-border overflow-hidden">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="rounded-none"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="rounded-none"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6">
        {/* Folders Sidebar */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-3">
          <div className="glass-card p-4">
            <h3 className="font-medium mb-3 text-sm text-muted-foreground">Folders</h3>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                <button
                  onClick={() => setSelectedFolderId(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
                    selectedFolderId === null ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                >
                  <Folder className="w-4 h-4" />
                  <span className="text-sm">All Yarns</span>
                  <span className="ml-auto text-xs text-muted-foreground">{entries.length}</span>
                </button>
                {folders.filter(f => !f.parent_id).map((folder) => (
                  <FolderItem
                    key={folder.id}
                    folder={folder}
                    allFolders={folders}
                    selectedFolderId={selectedFolderId}
                    onSelect={setSelectedFolderId}
                    onDelete={(id) => deleteFolder.mutate(id)}
                    entries={entries}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        </motion.div>

        {/* Yarn Grid */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-9">
          {entriesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No yarns yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Add your first yarn to start building your library
              </p>
              <Button onClick={() => setYarnDialogOpen(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Yarn
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredEntries.map((entry) => (
                <YarnCard key={entry.id} entry={entry} onDelete={() => deleteEntry.mutate(entry.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => (
                <YarnListItem key={entry.id} entry={entry} onDelete={() => deleteEntry.mutate(entry.id)} />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}

// Helper Components
function FolderItem({
  folder,
  allFolders,
  selectedFolderId,
  onSelect,
  onDelete,
  entries,
}: {
  folder: { id: string; name: string };
  allFolders: { id: string; name: string; parent_id: string | null }[];
  selectedFolderId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  entries: YarnEntry[];
}) {
  const subfolders = allFolders.filter((f) => f.parent_id === folder.id);
  const entryCount = entries.filter((e) => e.folder_id === folder.id).length;

  return (
    <div>
      <div className="group flex items-center">
        <button
          onClick={() => onSelect(folder.id)}
          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${
            selectedFolderId === folder.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          }`}
        >
          <Folder className="w-4 h-4" />
          <span className="text-sm truncate">{folder.name}</span>
          <span className="ml-auto text-xs text-muted-foreground">{entryCount}</span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onDelete(folder.id)}
        >
          <Trash2 className="w-3 h-3 text-destructive" />
        </Button>
      </div>
      {subfolders.length > 0 && (
        <div className="ml-4 border-l border-border pl-2">
          {subfolders.map((subfolder) => (
            <FolderItem
              key={subfolder.id}
              folder={subfolder}
              allFolders={allFolders}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onDelete={onDelete}
              entries={entries}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function YarnCard({ entry, onDelete }: { entry: YarnEntry; onDelete: () => void }) {
  const status = YARN_STATUSES.find((s) => s.value === entry.status);
  const weight = YARN_WEIGHTS.find((w) => w.value === entry.weight);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card-hover p-4 group"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm">{entry.name}</h3>
          {entry.brand && <p className="text-xs text-muted-foreground">{entry.brand}</p>}
        </div>
        <Badge className={`${status?.color} text-xs`}>{status?.label}</Badge>
      </div>

      <div className="space-y-2 text-xs text-muted-foreground">
        {entry.color_code && <p>Color: {entry.color_code}</p>}
        {weight && <p>Weight: {weight.label}</p>}
        {entry.fiber_content && <p>Fiber: {entry.fiber_content}</p>}
        {entry.balls_in_stock > 0 && (
          <p className="text-primary font-medium">{entry.balls_in_stock} balls in stock</p>
        )}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          Updated {new Date(entry.updated_at).toLocaleDateString()}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Edit className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
            <Trash2 className="w-3 h-3 text-destructive" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function YarnListItem({ entry, onDelete }: { entry: YarnEntry; onDelete: () => void }) {
  const status = YARN_STATUSES.find((s) => s.value === entry.status);
  const weight = YARN_WEIGHTS.find((w) => w.value === entry.weight);

  return (
    <motion.div
      layout
      className="glass-card p-4 flex items-center gap-4 group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm truncate">{entry.name}</h3>
          <Badge className={`${status?.color} text-xs`}>{status?.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {[entry.brand, weight?.label, entry.fiber_content].filter(Boolean).join(' • ')}
        </p>
      </div>

      {entry.balls_in_stock > 0 && (
        <span className="text-sm text-primary font-medium">{entry.balls_in_stock} balls</span>
      )}

      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDelete}>
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </motion.div>
  );
}

// Helper function to get folder path
function getFolderPath(
  folders: { id: string; name: string; parent_id: string | null }[],
  folderId: string
): { id: string | null; name: string }[] {
  const path: { id: string | null; name: string }[] = [];
  let current = folders.find((f) => f.id === folderId);

  while (current) {
    path.unshift({ id: current.id, name: current.name });
    current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) : undefined;
  }

  return path;
}
