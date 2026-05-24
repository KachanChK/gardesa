import { get, put } from '@vercel/blob'
import type { PutBlobResult } from '@vercel/blob'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { Readable } from 'stream'
import type { Response } from 'express'
import {
    AI_RENDER_ALLOWED_CONTENT_TYPES,
    AI_RENDER_MAX_UPLOAD_BYTES,
    getUploadExtension
} from './render-config'
import { readableStreamToBuffer } from './render-images'

export interface UploadIntentToken {
    contentType: 'image/png' | 'image/jpeg'
    pathname: string
    token: string
}

export function buildOriginalImagePathname(userId: string, renderId: string, contentType: string): string {
    return `ai-renders/users/${userId}/${renderId}/original.${getUploadExtension(contentType)}`
}

export function buildRenderedImagePathname(userId: string, renderId: string): string {
    return `ai-renders/users/${userId}/${renderId}/rendered.jpg`
}

export async function createUploadClientToken(pathname: string, contentType: 'image/png' | 'image/jpeg'): Promise<UploadIntentToken> {
    const token = await generateClientTokenFromReadWriteToken({
        allowedContentTypes: [...AI_RENDER_ALLOWED_CONTENT_TYPES],
        allowOverwrite: false,
        maximumSizeInBytes: AI_RENDER_MAX_UPLOAD_BYTES,
        pathname,
        validUntil: Date.now() + 15 * 60 * 1000
    })

    return {
        contentType,
        pathname,
        token
    }
}

export async function readPrivateBlob(pathname: string): Promise<{ buffer: Buffer, contentType: string, size: number }> {
    const result = await get(pathname, {
        access: 'private',
        useCache: false
    })

    if (!result || result.statusCode !== 200 || !result.stream) {
        throw new Error('Imagem enviada nao encontrada no storage.')
    }

    const buffer = await readableStreamToBuffer(result.stream)

    return {
        buffer,
        contentType: result.blob.contentType,
        size: result.blob.size
    }
}

export async function writeRenderedImage(pathname: string, buffer: Buffer): Promise<PutBlobResult> {
    return put(pathname, buffer, {
        access: 'private',
        allowOverwrite: true,
        contentType: 'image/jpeg'
    })
}

export async function pipePrivateBlobToResponse(pathname: string, res: Response): Promise<void> {
    const result = await get(pathname, {
        access: 'private'
    })

    if (!result || result.statusCode !== 200 || !result.stream) {
        res.status(404).send('Imagem nao encontrada.')
        return
    }

    res.setHeader('Content-Type', result.blob.contentType)
    res.setHeader('Content-Length', String(result.blob.size))
    res.setHeader('Cache-Control', 'private, max-age=60')

    Readable.fromWeb(result.stream as unknown as Parameters<typeof Readable.fromWeb>[0]).pipe(res)
}

