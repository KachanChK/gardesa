type AbacatePayMethod = 'PIX' | 'CARD'
type AbacatePayCycle = 'WEEKLY' | 'MONTHLY' | 'SEMIANNUALLY' | 'ANNUALLY'

interface AbacatePayEnvelope<T> {
    data: T | null
    error: string | null
    success?: boolean
}

interface AbacatePayCustomer {
    id: string
}

interface AbacatePayProduct {
    id: string
}

interface AbacatePayCheckout {
    id: string
    url: string
}

interface CreateChargeOptions {
    completionUrl: string
    customerId: string
    externalId: string
    items: Array<Record<string, unknown>>
    metadata: Record<string, string>
    methods: AbacatePayMethod[]
    returnUrl: string
}

function getBaseUrl(): string {
    return (process.env.ABACATEPAY_API_BASE_URL ?? 'https://api.abacatepay.com/v2').replace(/\/+$/, '')
}

function getApiKey(): string {
    const apiKey = process.env.ABACATEPAY_API_KEY

    if (!apiKey) {
        throw new Error('ABACATEPAY_API_KEY e obrigatoria.')
    }

    return apiKey
}

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${getBaseUrl()}${path}`, {
        body: JSON.stringify(body),
        headers: {
            Authorization: `Bearer ${getApiKey()}`,
            'Content-Type': 'application/json'
        },
        method: 'POST'
    })

    const payload = await response.json().catch(() => null) as AbacatePayEnvelope<T> | null

    if (!response.ok || !payload || payload.error || !payload.data) {
        const message = payload?.error ?? `AbacatePay respondeu com status ${response.status}.`
        throw new Error(message)
    }

    return payload.data
}

export async function createCustomer(options: {
    email: string
    name: string
    taxId: string
}): Promise<AbacatePayCustomer> {
    return request<AbacatePayCustomer>('/customers/create', {
        email: options.email,
        name: options.name,
        taxId: options.taxId
    })
}

export async function createProduct(options: {
    cycle: AbacatePayCycle
    externalId: string
    name: string
    priceCents: number
}): Promise<AbacatePayProduct> {
    return request<AbacatePayProduct>('/products/create', {
        currency: 'BRL',
        cycle: options.cycle,
        externalId: options.externalId,
        name: options.name,
        price: options.priceCents
    })
}

export async function createSubscription(options: CreateChargeOptions): Promise<AbacatePayCheckout> {
    return request<AbacatePayCheckout>('/subscriptions/create', buildChargeBody(options))
}

export async function createCheckout(options: CreateChargeOptions): Promise<AbacatePayCheckout> {
    return request<AbacatePayCheckout>('/checkouts/create', buildChargeBody(options))
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
    await request<{ id: string }>('/subscriptions/cancel', { id: subscriptionId })
}

function buildChargeBody(options: CreateChargeOptions): Record<string, unknown> {
    return {
        completionUrl: options.completionUrl,
        customerId: options.customerId,
        externalId: options.externalId,
        items: options.items,
        metadata: options.metadata,
        methods: options.methods,
        returnUrl: options.returnUrl
    }
}
