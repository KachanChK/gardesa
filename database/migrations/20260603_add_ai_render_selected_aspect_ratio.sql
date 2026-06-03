ALTER TABLE public.ai_renders
    ADD COLUMN IF NOT EXISTS selected_aspect_ratio text;

UPDATE public.ai_renders
SET selected_aspect_ratio = 'match_input_image'
WHERE selected_aspect_ratio IS NULL
    AND status <> 'pending';

ALTER TABLE public.ai_renders
    DROP CONSTRAINT IF EXISTS ai_renders_selected_aspect_ratio_check;

ALTER TABLE public.ai_renders
    ADD CONSTRAINT ai_renders_selected_aspect_ratio_check
    CHECK (
        selected_aspect_ratio IS NULL
        OR selected_aspect_ratio IN ('match_input_image', '1:1', '3:4', '16:9', '9:16')
    ) NOT VALID;

ALTER TABLE public.ai_renders
    VALIDATE CONSTRAINT ai_renders_selected_aspect_ratio_check;
