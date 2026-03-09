ALTER TABLE public.pattern_library
ADD COLUMN IF NOT EXISTS linked_yarn_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pattern_library_linked_yarn_id_fkey'
  ) THEN
    ALTER TABLE public.pattern_library
    ADD CONSTRAINT pattern_library_linked_yarn_id_fkey
    FOREIGN KEY (linked_yarn_id)
    REFERENCES public.yarn_entries(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pattern_library_linked_yarn_id
ON public.pattern_library(linked_yarn_id);