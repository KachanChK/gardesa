import { db } from '../config/database'
import type { AiRenderAspectRatio, AiRenderEnvironment, AiRenderQuality, AiRenderWeather } from './render-config'

export interface AiRenderRecord {
    aspect_ratio: string | null
    completed_at: Date | null
    created_at: Date
    deleted_at: Date | null
    error_message: string | null
    id: string
    is_deleted: boolean
    is_favorite: boolean
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
    selected_aspect_ratio: AiRenderAspectRatio | null
    selected_environment: AiRenderEnvironment | null
    selected_quality: AiRenderQuality | null
    selected_weather: AiRenderWeather | null
    status: 'pending' | 'processing' | 'completed' | 'failed'
    updated_at: Date
    user_id: string
}

export interface AiRenderGalleryRecord {
    completed_at: Date | null
    created_at: Date
    id: string
    is_favorite: boolean
    original_image_url: string | null
    rendered_image_url: string | null
    selected_environment: AiRenderEnvironment | null
    selected_quality: AiRenderQuality | null
    selected_weather: AiRenderWeather | null
    sort_at: Date
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

export async function claimAiRenderForProcessing(id: string, userId: string): Promise<boolean> {
    const result = await db.query(
        `UPDATE ai_renders
        SET status = 'processing', updated_at = now()
        WHERE id = $1 AND user_id = $2 AND status = 'pending'
        RETURNING id`,
        [id, userId]
    )

    return result.rowCount === 1
}

export async function findAiRenderForUser(id: string, userId: string): Promise<AiRenderRecord | null> {
    const result = await db.query<AiRenderRecord>(
        'SELECT * FROM ai_renders WHERE id = $1 AND user_id = $2 LIMIT 1',
        [id, userId]
    )

    return result.rows[0] ?? null
}

export async function listAiRendersForGallery(options: {
    cursor?: { id: string, sortAt: string } | null
    favoritesOnly: boolean
    limit: number
    userId: string
}): Promise<AiRenderGalleryRecord[]> {
    const params: unknown[] = [options.userId]
    const where = [
        'user_id = $1',
        "status = 'completed'",
        'is_deleted = false',
        'rendered_blob_pathname IS NOT NULL'
    ]

    if (options.favoritesOnly) {
        where.push('is_favorite = true')
    }

    if (options.cursor) {
        params.push(options.cursor.sortAt, options.cursor.id)
        where.push(`(COALESCE(completed_at, created_at), id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`)
    }

    params.push(options.limit)

    const result = await db.query<AiRenderGalleryRecord>(
        `SELECT
            id,
            original_image_url,
            rendered_image_url,
            selected_environment,
            selected_weather,
            selected_quality,
            is_favorite,
            created_at,
            completed_at,
            COALESCE(completed_at, created_at) AS sort_at
        FROM ai_renders
        WHERE ${where.join(' AND ')}
        ORDER BY COALESCE(completed_at, created_at) DESC, id DESC
        LIMIT $${params.length}`,
        params
    )

    return result.rows
}

export async function updateAiRenderFavorite(options: {
    id: string
    isFavorite: boolean
    userId: string
}): Promise<AiRenderRecord | null> {
    const result = await db.query<AiRenderRecord>(
        `UPDATE ai_renders
        SET is_favorite = $3,
            updated_at = now()
        WHERE id = $1
            AND user_id = $2
            AND status = 'completed'
            AND is_deleted = false
        RETURNING *`,
        [options.id, options.userId, options.isFavorite]
    )

    return result.rows[0] ?? null
}

export async function markAiRenderDeleted(options: {
    id: string
    userId: string
}): Promise<AiRenderRecord | null> {
    const result = await db.query<AiRenderRecord>(
        `UPDATE ai_renders
        SET is_deleted = true,
            deleted_at = now(),
            is_favorite = false,
            updated_at = now()
        WHERE id = $1
            AND user_id = $2
            AND status = 'completed'
            AND is_deleted = false
        RETURNING *`,
        [options.id, options.userId]
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
    selectedAspectRatio: AiRenderAspectRatio
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
            selected_aspect_ratio = $9,
            prompt_used = $10,
            replicate_model = $11,
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
            options.selectedAspectRatio,
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
