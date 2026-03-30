ALTER TABLE public.yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_photo_url text;
ALTER TABLE public.yarn_entries ADD COLUMN IF NOT EXISTS post_wash_photo_url text;