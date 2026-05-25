ALTER TABLE public.ai_renders
    ADD COLUMN IF NOT EXISTS selected_environment text;

ALTER TABLE public.ai_renders
    DROP CONSTRAINT IF EXISTS ai_renders_selected_environment_check;

ALTER TABLE public.ai_renders
    ADD CONSTRAINT ai_renders_selected_environment_check
    CHECK (selected_environment IS NULL OR selected_environment IN ('exterior', 'interior'));

ALTER TABLE public.ai_renders
    DROP CONSTRAINT IF EXISTS ai_renders_selected_weather_check;

ALTER TABLE public.ai_renders
    ADD CONSTRAINT ai_renders_selected_weather_check
    CHECK (selected_weather IS NULL OR selected_weather IN ('dia', 'noite', 'chuvoso', 'por-do-sol'));
