
-- Pattern Library main table
CREATE TABLE public.pattern_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('crochet', 'knitting')),
  title TEXT NOT NULL,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'in_progress', 'completed')),
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own patterns" ON public.pattern_library FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own patterns" ON public.pattern_library FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own patterns" ON public.pattern_library FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own patterns" ON public.pattern_library FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER handle_pattern_library_updated_at BEFORE UPDATE ON public.pattern_library
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Pattern Files table
CREATE TABLE public.pattern_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.pattern_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pattern files" ON public.pattern_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pattern files" ON public.pattern_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pattern files" ON public.pattern_files FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pattern files" ON public.pattern_files FOR DELETE USING (auth.uid() = user_id);

-- Pattern Annotations table
CREATE TABLE public.pattern_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_file_id UUID NOT NULL REFERENCES public.pattern_files(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('pen', 'highlight', 'note')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own annotations" ON public.pattern_annotations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own annotations" ON public.pattern_annotations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own annotations" ON public.pattern_annotations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own annotations" ON public.pattern_annotations FOR DELETE USING (auth.uid() = user_id);

-- Pattern AI Parses table
CREATE TABLE public.pattern_ai_parses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.pattern_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parsed_steps JSONB NOT NULL DEFAULT '[]',
  anchor_regions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_ai_parses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai parses" ON public.pattern_ai_parses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai parses" ON public.pattern_ai_parses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai parses" ON public.pattern_ai_parses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai parses" ON public.pattern_ai_parses FOR DELETE USING (auth.uid() = user_id);

-- Pattern Progress table
CREATE TABLE public.pattern_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_id UUID NOT NULL REFERENCES public.pattern_library(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  total_steps INT NOT NULL DEFAULT 0,
  step_timestamps JSONB DEFAULT '[]',
  corrections JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pattern_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress" ON public.pattern_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.pattern_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.pattern_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.pattern_progress FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER handle_pattern_progress_updated_at BEFORE UPDATE ON public.pattern_progress
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Storage bucket for pattern files
INSERT INTO storage.buckets (id, name, public) VALUES ('pattern-files', 'pattern-files', true);

-- Storage RLS policies
CREATE POLICY "Users can upload pattern files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pattern-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view pattern files" ON storage.objects FOR SELECT
  USING (bucket_id = 'pattern-files');

CREATE POLICY "Users can delete own pattern files" ON storage.objects FOR DELETE
  USING (bucket_id = 'pattern-files' AND (storage.foldername(name))[1] = auth.uid()::text);
