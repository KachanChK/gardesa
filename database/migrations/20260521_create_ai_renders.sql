CREATE TABLE IF NOT EXISTS public.ai_renders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES neon_auth."user"(id) ON DELETE CASCADE,
    original_image_url text,
    original_blob_pathname text,
    original_content_type text,
    original_size_bytes integer,
    original_width integer,
    original_height integer,
    rendered_image_url text,
    rendered_blob_pathname text,
    selected_environment text,
    selected_weather text,
    selected_quality text,
    prompt_used text,
    aspect_ratio text,
    output_format text NOT NULL DEFAULT 'jpg',
    replicate_prediction_id text,
    replicate_model text,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    completed_at timestamptz,
    CONSTRAINT ai_renders_selected_environment_check
        CHECK (selected_environment IS NULL OR selected_environment IN ('exterior', 'interior')),
    CONSTRAINT ai_renders_selected_weather_check
        CHECK (selected_weather IS NULL OR selected_weather IN ('dia', 'noite', 'chuvoso', 'por-do-sol')),
    CONSTRAINT ai_renders_selected_quality_check
        CHECK (selected_quality IS NULL OR selected_quality IN ('1K', '2K', '4K')),
    CONSTRAINT ai_renders_output_format_check
        CHECK (output_format IN ('jpg', 'png')),
    CONSTRAINT ai_renders_status_check
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    CONSTRAINT ai_renders_original_content_type_check
        CHECK (original_content_type IS NULL OR original_content_type IN ('image/png', 'image/jpeg'))
);

CREATE INDEX IF NOT EXISTS ai_renders_user_created_at_idx
    ON public.ai_renders (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_renders_user_status_idx
    ON public.ai_renders (user_id, status);
