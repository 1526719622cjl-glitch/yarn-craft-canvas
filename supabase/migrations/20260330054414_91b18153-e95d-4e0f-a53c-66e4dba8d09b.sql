
ALTER TABLE public.pattern_library ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
ALTER TABLE public.pattern_library ADD COLUMN IF NOT EXISTS finished_photo_url text;
