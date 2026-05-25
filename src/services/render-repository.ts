import { db } from '../config/database'
import type { AiRenderEnvironment, AiRenderQuality, AiRenderWeather } from './render-config'

export interface AiRenderRecord {
    aspect_ratio: string | null
    error_message: string | null
    id: string
    original_blob_pathname: string | null
    original_content_type: string | null
    original_height: number | null
    original_image_url: string | null
    original_size_bytes: number | null
    original_width: number | null
    prompt_used: string | null
    rendered_blob_pathname: string | null
    rendered_image_url: string | null
    replicate_model: string | null
    replicate_prediction_id: string | null
    selected_environment: AiRenderEnvironment | null
    selected_quality: AiRenderQuality | null
    selected_weather: AiRenderWeather | null
    status: 'pending' | 'processing' | 'completed' | 'failed'
    user_id: string
}

export async function createPendingAiRender(options: {
    id: string
    originalBlobPathname: string
    originalContentType: string
    originalImageUrl: string
    originalSizeBytes: number
    userId: string
}): Promise<AiRenderRecord> {
    const result = await db.query<AiRenderRecord>(
        `INSERT INTO ai_renders (
            id,
            user_id,
            original_image_url,
            original_blob_pathname,
            original_content_type,
            original_size_bytes,
            status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
        RETURNING *`,
        [
            options.id,
            options.userId,
            options.originalImageUrl,
            options.originalBlobPathname,
            options.originalContentType,
            options.originalSizeBytes
        ]
    )

    return result.rows[0]
}

export async function findAiRenderForUser(id: string, userId: string): Promise<AiRenderRecord | null> {
    const result = await db.query<AiRenderRecord>(
        'SELECT * FROM ai_renders WHERE id = $1 AND user_id = $2 LIMIT 1',
        [id, userId]
    )

    return result.rows[0] ?? null
}

export async function markAiRenderProcessing(options: {
    aspectRatio: string
    environment: AiRenderEnvironment
    height: number
    id: string
    promptUsed: string
    quality: AiRenderQuality
    replicateModel: string
    userId: string
    weather: AiRenderWeather
    width: number
}): Promise<void> {
    await db.query(
        `UPDATE ai_renders
        SET aspect_ratio = $3,
            original_width = $4,
            original_height = $5,
            selected_environment = $6,
            selected_weather = $7,
            selected_quality = $8,
            prompt_used = $9,
            replicate_model = $10,
            status = 'processing',
            error_message = NULL,
            updated_at = now()
        WHERE id = $1 AND user_id = $2`,
        [
            options.id,
            options.userId,
            options.aspectRatio,
            options.width,
            options.height,
            options.environment,
            options.weather,
            options.quality,
            options.promptUsed,
            options.replicateModel
        ]
    )
}

export async function markAiRenderCompleted(options: {
    id: string
    renderedBlobPathname: string
    renderedImageUrl: string
    replicatePredictionId: string | null
    userId: string
}): Promise<void> {
    await db.query(
        `UPDATE ai_renders
        SET rendered_image_url = $3,
            rendered_blob_pathname = $4,
            replicate_prediction_id = $5,
            status = 'completed',
            error_message = NULL,
            completed_at = now(),
            updated_at = now()
        WHERE id = $1 AND user_id = $2`,
        [
            options.id,
            options.userId,
            options.renderedImageUrl,
            options.renderedBlobPathname,
            options.replicatePredictionId
        ]
    )
}

export async function markAiRenderFailed(options: {
    errorMessage: string
    id: string
    userId: string
}): Promise<void> {
    await db.query(
        `UPDATE ai_renders
        SET status = 'failed',
            error_message = $3,
            updated_at = now()
        WHERE id = $1 AND user_id = $2`,
        [options.id, options.userId, options.errorMessage]
    )
}
