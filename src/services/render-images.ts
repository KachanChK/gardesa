import { imageSize } from 'image-size'

export interface ImageMetadata {
    aspectRatio: string
    height: number
    mimeType: 'image/png' | 'image/jpeg'
    width: number
}

export function detectImageMime(buffer: Buffer): ImageMetadata['mimeType'] | null {
    if (buffer.length >= 8
        && buffer[0] === 0x89
        && buffer[1] === 0x50
        && buffer[2] === 0x4e
        && buffer[3] === 0x47
        && buffer[4] === 0x0d
        && buffer[5] === 0x0a
        && buffer[6] === 0x1a
        && buffer[7] === 0x0a) {
        return 'image/png'
    }

    if (buffer.length >= 3
        && buffer[0] === 0xff
        && buffer[1] === 0xd8
        && buffer[2] === 0xff) {
        return 'image/jpeg'
    }

    return null
}

export function getImageMetadata(buffer: Buffer): ImageMetadata {
    const mimeType = detectImageMime(buffer)

    if (!mimeType) {
        throw new Error('Formato de imagem invalido. Envie apenas PNG ou JPG.')
    }

    const dimensions = imageSize(buffer)

    if (!dimensions.width || !dimensions.height) {
        throw new Error('Nao foi possivel identificar as dimensoes da imagem.')
    }

    return {
        aspectRatio: `${dimensions.width}:${dimensions.height}`,
        height: dimensions.height,
        mimeType,
        width: dimensions.width
    }
}

export async function readableStreamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const chunks: Buffer[] = []
    const reader = stream.getReader()

    while (true) {
        const { done, value } = await reader.read()

        if (done) {
            break
        }

        chunks.push(Buffer.from(value))
    }

    return Buffer.concat(chunks)
}

