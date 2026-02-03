import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

// Types matching database schema
export type YarnWeight = 'lace' | 'fingering' | 'sport' | 'dk' | 'worsted' | 'aran' | 'bulky' | 'super_bulky';
export type YarnStatus = 'new' | 'in_use' | 'scraps' | 'finished' | 'wishlist';

export interface YarnFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  created_at: string;
}

export interface YarnEntry {
  id: string;
  user_id: string;
  folder_id: string | null;
  name: string;
  brand: string | null;
  color_code: string | null;
  fiber_content: string | null;
  weight: YarnWeight | null;
  status: YarnStatus;
  stitches_per_10cm: number | null;
  rows_per_10cm: number | null;
  post_wash_width_cm: number | null;
  post_wash_height_cm: number | null;
  meters_per_ball: number | null;
  grams_per_ball: number | null;
  balls_in_stock: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSpec {
  id: string;
  user_id: string;
  yarn_entry_id: string | null;
  name: string;
  target_width_cm: number | null;
  target_height_cm: number | null;
  total_stitches: number | null;
  total_rows: number | null;
  adjusted_stitches: number | null;
  adjusted_rows: number | null;
  total_meters_needed: number | null;
  total_grams_needed: number | null;
  balls_needed: number | null;
  width_shrinkage_factor: number | null;
  height_shrinkage_factor: number | null;
  notes: string | null;
  created_at: string;
}

export function useYarnFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const foldersQuery = useQuery({
    queryKey: ['yarn-folders', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('yarn_folders')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as YarnFolder[];
    },
    enabled: !!user,
  });

  const createFolder = useMutation({
    mutationFn: async (folder: { name: string; parent_id?: string | null; color?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('yarn_folders')
        .insert({
          user_id: user.id,
          name: folder.name,
          parent_id: folder.parent_id ?? null,
          color: folder.color,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarn-folders'] });
      toast({ title: 'Folder created' });
    },
    onError: (error) => {
      toast({ title: 'Failed to create folder', description: error.message, variant: 'destructive' });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (folderId: string) => {
      const { error } = await supabase
        .from('yarn_folders')
        .delete()
        .eq('id', folderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarn-folders'] });
      queryClient.invalidateQueries({ queryKey: ['yarn-entries'] });
      toast({ title: 'Folder deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete folder', description: error.message, variant: 'destructive' });
    },
  });

  return {
    folders: foldersQuery.data ?? [],
    isLoading: foldersQuery.isLoading,
    createFolder,
    deleteFolder,
  };
}

export function useYarnEntries(folderId?: string | null, searchQuery?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const entriesQuery = useQuery({
    queryKey: ['yarn-entries', user?.id, folderId, searchQuery],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('yarn_entries')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (folderId !== undefined) {
        query = query.eq('folder_id', folderId);
      }
      
      if (searchQuery?.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,brand.ilike.%${searchQuery}%,fiber_content.ilike.%${searchQuery}%,color_code.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as YarnEntry[];
    },
    enabled: !!user,
  });

  const createEntry = useMutation({
    mutationFn: async (entry: Omit<YarnEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('yarn_entries')
        .insert({
          user_id: user.id,
          ...entry,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarn-entries'] });
      toast({ title: 'Yarn saved to library' });
    },
    onError: (error) => {
      toast({ title: 'Failed to save yarn', description: error.message, variant: 'destructive' });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<YarnEntry> & { id: string }) => {
      const { data, error } = await supabase
        .from('yarn_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarn-entries'] });
      toast({ title: 'Yarn updated' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update yarn', description: error.message, variant: 'destructive' });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (entryId: string) => {
      const { error } = await supabase
        .from('yarn_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yarn-entries'] });
      toast({ title: 'Yarn deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete yarn', description: error.message, variant: 'destructive' });
    },
  });

  return {
    entries: entriesQuery.data ?? [],
    isLoading: entriesQuery.isLoading,
    createEntry,
    updateEntry,
    deleteEntry,
  };
}

export function useProjectSpecs() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const specsQuery = useQuery({
    queryKey: ['project-specs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('project_specs')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProjectSpec[];
    },
    enabled: !!user,
  });

  const createSpec = useMutation({
    mutationFn: async (spec: Omit<ProjectSpec, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('project_specs')
        .insert({
          user_id: user.id,
          ...spec,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-specs'] });
      toast({ title: 'Project specs saved' });
    },
    onError: (error) => {
      toast({ title: 'Failed to save project', description: error.message, variant: 'destructive' });
    },
  });

  const deleteSpec = useMutation({
    mutationFn: async (specId: string) => {
      const { error } = await supabase
        .from('project_specs')
        .delete()
        .eq('id', specId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-specs'] });
      toast({ title: 'Project deleted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete project', description: error.message, variant: 'destructive' });
    },
  });

  return {
    specs: specsQuery.data ?? [],
    isLoading: specsQuery.isLoading,
    createSpec,
    deleteSpec,
  };
}
