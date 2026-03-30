import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import type { PixelCell } from '@/store/useYarnCluesStore';

export interface KnittingProgress {
  currentRow: number;
  highlightedCells: string[]; // "x,y" keys
}

export interface PixelDesign {
  id: string;
  user_id: string;
  name: string;
  grid_data: PixelCell[];
  width: number;
  height: number;
  color_palette: string[];
  knitting_progress: KnittingProgress;
  created_at: string;
  updated_at: string;
}

const EMPTY_PROGRESS: KnittingProgress = { currentRow: -1, highlightedCells: [] };

export function usePixelDesigns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const designsQuery = useQuery({
    queryKey: ['pixel-designs', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pixel_designs' as any)
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(d => ({
        ...d,
        grid_data: d.grid_data as PixelCell[],
        color_palette: d.color_palette as string[],
        knitting_progress: (d.knitting_progress as KnittingProgress) || EMPTY_PROGRESS,
      })) as PixelDesign[];
    },
    enabled: !!user,
  });

  const saveDesign = useMutation({
    mutationFn: async (design: { name: string; grid_data: PixelCell[]; width: number; height: number; color_palette: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('pixel_designs' as any)
        .insert({
          user_id: user.id,
          name: design.name,
          grid_data: design.grid_data as any,
          width: design.width,
          height: design.height,
          color_palette: design.color_palette as any,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-designs'] });
    },
  });

  const updateKnittingProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: KnittingProgress }) => {
      const { error } = await supabase
        .from('pixel_designs' as any)
        .update({ knitting_progress: progress as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-designs'] });
    },
  });

  const deleteDesign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pixel_designs' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pixel-designs'] });
    },
  });

  return {
    designs: designsQuery.data ?? [],
    isLoading: designsQuery.isLoading,
    saveDesign,
    deleteDesign,
    updateKnittingProgress,
  };
}
