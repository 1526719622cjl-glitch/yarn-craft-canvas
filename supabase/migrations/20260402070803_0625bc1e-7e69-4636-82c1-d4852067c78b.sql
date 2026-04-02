CREATE TABLE public.quick_calc_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  swatch_width NUMERIC NOT NULL,
  swatch_height NUMERIC NOT NULL,
  stitches INTEGER NOT NULL,
  rows INTEGER NOT NULL,
  target_width NUMERIC NOT NULL,
  target_height NUMERIC NOT NULL,
  result_stitches INTEGER NOT NULL,
  result_rows INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_calc_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick calc history" ON public.quick_calc_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quick calc history" ON public.quick_calc_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick calc history" ON public.quick_calc_history FOR DELETE TO authenticated USING (auth.uid() = user_id);