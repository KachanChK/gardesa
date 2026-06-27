import crypto from 'crypto'
import { applyPaidCycleForUser, downgradeToFree } from './credits-service'
import {
    findUserBySubscriptionId,
    getPaymentCustomer,
    markPaymentEvent,
    markSubscriptionCancelled,
    recordPaymentEvent
} from './credits-repository'

interface ParsedWebhookEvent {
    data: Record<string, unknown>
    event: string
    id: string
}

export function isWebhookSecretValid(querySecret: unknown): boolean {
    const expected = process.env.ABACATEPAY_WEBHOOK_SECRET

    if (!expected) {
        return false
    }

    const received = typeof querySecret === 'string' ? querySecret : ''

    return safeEquals(received, expected)
}

export function isWebhookSignatureValid(rawBody: Buffer, signatureHeader: unknown): boolean {
    const publicKey = process.env.ABACATEPAY_PUBLIC_KEY

    if (!publicKey || typeof signatureHeader !== 'string' || !signatureHeader) {
        return false
    }

    const expected = crypto.createHmac('sha256', publicKey).update(rawBody).digest('base64')

    return safeEquals(signatureHeader, expected)
}

export async function processWebhookEvent(rawBody: Buffer): Promise<void> {
    const parsed = parseEvent(rawBody)

    if (!parsed) {
        return
    }

    const isNew = await recordPaymentEvent({
        eventId: parsed.id,
        eventType: parsed.event,
        payload: JSON.parse(rawBody.toString('utf8'))
    })

    if (!isNew) {
        return
    }

    try {
        await dispatchEvent(parsed)
        await markPaymentEvent(parsed.id, 'processed')
    } catch (error) {
        await markPaymentEvent(parsed.id, 'failed').catch(() => undefined)
        throw error
    }
}

async function dispatchEvent(parsed: ParsedWebhookEvent): Promise<void> {
    switch (parsed.event) {
        case 'subscription.completed':
        case 'subscription.renewed':
            await handlePaidCycle(parsed, 'CARD')
            return
        case 'checkout.completed':
            await handlePaidCycle(parsed, 'PIX')
            return
        case 'subscription.cancelled':
            await handleCancelled(parsed)
            return
        default:
            return
    }
}

async function handlePaidCycle(parsed: ParsedWebhookEvent, paymentMethod: 'CARD' | 'PIX'): Promise<void> {
    const metadata = extractMetadata(parsed.data)
    const userId = metadata.userId
    const planSlug = metadata.planSlug

    if (!userId || !planSlug) {
        return
    }

    const subscriptionId = readString(parsed.data, 'id')
    const customer = await getPaymentCustomer(userId)
    const currentPeriodEnd = paymentMethod === 'PIX'
        ? addOneMonth(new Date())
        : parseDate(readString(parsed.data, 'nextBilling') ?? readString(parsed.data, 'current_period_end'))

    const cycleKey = paymentMethod === 'PIX'
        ? `abacatepay:pix:${subscriptionId ?? parsed.id}`
        : `abacatepay:${subscriptionId ?? 'sub'}:${currentPeriodEnd ? currentPeriodEnd.toISOString() : parsed.id}`

    await applyPaidCycleForUser({
        currentPeriodEnd,
        idempotencyKey: cycleKey,
        paymentMethod,
        planSlug,
        providerCustomerId: customer?.provider_customer_id ?? readString(parsed.data, 'customerId'),
        providerSubscriptionId: subscriptionId,
        userId
    })
}

async function handleCancelled(parsed: ParsedWebhookEvent): Promise<void> {
    const subscriptionId = readString(parsed.data, 'id')

    if (!subscriptionId) {
        return
    }

    const immediate = readBoolean(parsed.data, 'immediate') === true

    if (immediate) {
        const userId = await findUserBySubscriptionId(subscriptionId)

        if (userId) {
            await downgradeToFree(userId)
        }

        return
    }

    await markSubscriptionCancelled({ cancelAtPeriodEnd: true, providerSubscriptionId: subscriptionId })
}

function parseEvent(rawBody: Buffer): ParsedWebhookEvent | null {
    let payload: unknown

    try {
        payload = JSON.parse(rawBody.toString('utf8'))
    } catch {
        return null
    }

    const record = asRecord(payload)

    if (!record) {
        return null
    }

    const id = readString(record, 'id')
    const event = readString(record, 'event')
    const data = asRecord(record.data)

    if (!id || !event || !data) {
        return null
    }

    return { data, event, id }
}

function extractMetadata(data: Record<string, unknown>): { planSlug: string | null, userId: string | null } {
    const candidates = [
        asRecord(data.metadata),
        asRecord(asRecord(data.subscription)?.metadata),
        asRecord(asRecord(data.billing)?.metadata)
    ]

    for (const candidate of candidates) {
        if (candidate) {
            const userId = readString(candidate, 'userId')
            const planSlug = readString(candidate, 'planSlug')

            if (userId && planSlug) {
                return { planSlug, userId }
            }
        }
    }

    const externalId = readString(data, 'externalId') ?? readString(asRecord(data.subscription) ?? {}, 'externalId')

    if (externalId) {
        const [userId, planSlug] = externalId.split(':')

        if (userId && planSlug) {
            return { planSlug, userId }
        }
    }

    return { planSlug: null, userId: null }
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null
}

function readString(record: Record<string, unknown>, key: string): string | null {
    const value = record[key]
    return typeof value === 'string' && value.length > 0 ? value : null
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
    const value = record[key]
    return typeof value === 'boolean' ? value : null
}

function parseDate(value: string | null): Date | null {
    if (!value) {
        return null
    }

    const parsed = new Date(value)

    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function addOneMonth(date: Date): Date {
    const result = new Date(date)
    result.setMonth(result.getMonth() + 1)
    return result
}

function safeEquals(received: string, expected: string): boolean {
    const receivedBuffer = Buffer.from(received)
    const expectedBuffer = Buffer.from(expected)

    if (receivedBuffer.length !== expectedBuffer.length) {
        return false
    }

    return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
}
