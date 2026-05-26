ALTER TABLE public.ai_renders
    ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

ALTER TABLE public.ai_renders
    ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.ai_renders
    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS ai_renders_gallery_user_completed_idx
    ON public.ai_renders (user_id, (COALESCE(completed_at, created_at)) DESC, id DESC)
    WHERE status = 'completed' AND is_deleted = false;

CREATE INDEX IF NOT EXISTS ai_renders_gallery_user_favorites_idx
    ON public.ai_renders (user_id, (COALESCE(completed_at, created_at)) DESC, id DESC)
    WHERE status = 'completed' AND is_deleted = false AND is_favorite = true;
