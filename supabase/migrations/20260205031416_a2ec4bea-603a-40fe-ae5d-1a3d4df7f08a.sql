-- Add pre-wash swatch data fields
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_width_cm numeric;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS pre_wash_height_cm numeric;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS stitches_pre_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS rows_pre_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS stitches_post_wash integer;
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS rows_post_wash integer;

-- Add tool information fields
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS tool_type text CHECK (tool_type IN ('hook', 'needle'));
ALTER TABLE yarn_entries ADD COLUMN IF NOT EXISTS tool_size_mm numeric;