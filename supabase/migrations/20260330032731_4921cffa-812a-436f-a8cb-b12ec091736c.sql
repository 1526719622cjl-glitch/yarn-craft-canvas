CREATE TABLE public.pixel_designs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  grid_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  color_palette JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pixel_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pixel designs" ON public.pixel_designs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pixel designs" ON public.pixel_designs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pixel designs" ON public.pixel_designs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pixel designs" ON public.pixel_designs FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER handle_pixel_designs_updated_at BEFORE UPDATE ON public.pixel_designs FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();