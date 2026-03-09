import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';
import { generateImageThumbnail, isThumbableImage } from '@/lib/thumbnailGenerator';

export interface PatternEntry {
  id: string;
  user_id: string;
  category: 'crochet' | 'knitting';
  title: string;
  description: string | null;
  tags: string[];
  status: 'preparing' | 'in_progress' | 'completed';
  cover_image_url: string | null;
  linked_yarn_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatternFile {
  id: string;
  pattern_id: string;
  user_id: string;
  file_url: string;
  file_type: string;
  sort_order: number;
  created_at: string;
}

export interface CreatePatternInput {
  title: string;
  description?: string;
  tags?: string[];
  status?: 'preparing' | 'in_progress' | 'completed';
  linkedYarnId?: string | null;
}

export function usePatternLibrary(category: 'crochet' | 'knitting') {
  const { user } = useAuth();
  const [patterns, setPatterns] = useState<PatternEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPatterns = useCallback(async () => {
    if (!user) {
      setPatterns([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let query = supabase
      .from('pattern_library')
      .select('*')
      .eq('category', category)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    if (searchQuery.trim()) {
      query = query.or(`title.ilike.%${searchQuery}%,tags.cs.{${searchQuery}}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching patterns:', error);
    } else {
      setPatterns((data || []) as unknown as PatternEntry[]);
    }

    setLoading(false);
  }, [user, category, statusFilter, searchQuery]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  const createPattern = async ({
    title,
    description,
    tags,
    status = 'preparing',
    linkedYarnId = null,
  }: CreatePatternInput) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('pattern_library')
      .insert({
        user_id: user.id,
        category,
        title,
        description: description || null,
        tags: tags || [],
        status,
        linked_yarn_id: linkedYarnId,
      } as any)
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return null;
    }

    await fetchPatterns();
    return data as unknown as PatternEntry;
  };

  const updatePattern = async (
    id: string,
    updates: Partial<
      Pick<
        PatternEntry,
        'title' | 'description' | 'tags' | 'status' | 'cover_image_url' | 'linked_yarn_id'
      >
    >
  ) => {
    const { error } = await supabase.from('pattern_library').update(updates as any).eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchPatterns();
  };

  const deletePattern = async (id: string) => {
    const { error } = await supabase.from('pattern_library').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchPatterns();
  };

  const uploadFile = async (patternId: string, file: File): Promise<string | null> => {
    if (!user) return null;

    const ext = file.name.split('.').pop();
    const basePath = `${user.id}/${patternId}`;
    const originalPath = `${basePath}/${Date.now()}.${ext}`;

    // Upload original file
    const { error: uploadError } = await supabase.storage.from('pattern-files').upload(originalPath, file);
    if (uploadError) {
      toast({ title: 'Upload error', description: uploadError.message, variant: 'destructive' });
      return null;
    }

    const { data: urlData } = supabase.storage.from('pattern-files').getPublicUrl(originalPath);
    const fileUrl = urlData.publicUrl;
    const isImage = file.type.startsWith('image');

    // Insert file record
    await supabase.from('pattern_files').insert({
      pattern_id: patternId,
      user_id: user.id,
      file_url: fileUrl,
      file_type: isImage ? 'image' : 'pdf',
    } as any);

    // Check if we should set the cover image
    const { data: existingFiles } = await supabase.from('pattern_files').select('id').eq('pattern_id', patternId);
    const shouldSetCover = (existingFiles || []).length <= 1;

    if (shouldSetCover) {
      let coverUrl = fileUrl;

      // Generate thumbnail for image files
      if (isThumbableImage(file)) {
        try {
          const thumbBlob = await generateImageThumbnail(file, 400, 520);
          if (thumbBlob) {
            const thumbPath = `${basePath}/thumb_${Date.now()}.jpg`;
            const { error: thumbErr } = await supabase.storage.from('pattern-files').upload(thumbPath, thumbBlob, {
              contentType: 'image/jpeg',
            });
            if (!thumbErr) {
              const { data: thumbUrl } = supabase.storage.from('pattern-files').getPublicUrl(thumbPath);
              coverUrl = thumbUrl.publicUrl;
            }
          }
        } catch (e) {
          console.warn('Thumbnail generation failed, using original', e);
        }
      }

      // Only update cover for images (not PDFs)
      if (isImage) {
        await supabase.from('pattern_library').update({ cover_image_url: coverUrl } as any).eq('id', patternId);
      }
    }

    return fileUrl;
  };

  const getPatternFiles = async (patternId: string): Promise<PatternFile[]> => {
    const { data } = await supabase.from('pattern_files').select('*').eq('pattern_id', patternId).order('sort_order');
    return (data || []) as unknown as PatternFile[];
  };

  return {
    patterns,
    loading,
    statusFilter,
    setStatusFilter,
    searchQuery,
    setSearchQuery,
    createPattern,
    updatePattern,
    deletePattern,
    uploadFile,
    getPatternFiles,
    refetch: fetchPatterns,
  };
}
