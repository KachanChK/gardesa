import type { AiRenderQuality } from './render-config'
import { getRenderCreditCost, isQualityAllowed } from './credits-config'
import {
    activatePaidCycle,
    downgradeUserToFree,
    ensureUserCreditSetup,
    getActiveSubscription,
    getBalance,
    getPlan,
    listExpiredPaidSubscriptions,
    refundRenderCredits,
    reserveRenderCredits,
    type SubscriptionPlanRecord,
    type UserSubscriptionRecord
} from './credits-repository'

export interface CreditSummary {
    allowedQualities: string[]
    balance: number
    currentPeriodEnd: Date | null
    isPaid: boolean
    paymentMethod: 'CARD' | 'PIX' | null
    planName: string
    planSlug: string
    renews: boolean
}

export class InsufficientCreditsError extends Error {
    readonly balance: number
    readonly requiredCredits: number

    constructor(balance: number, requiredCredits: number) {
        super('Creditos insuficientes para gerar este render.')
        this.name = 'InsufficientCreditsError'
        this.balance = balance
        this.requiredCredits = requiredCredits
    }
}

export class QualityNotAllowedError extends Error {
    readonly allowedQualities: string[]

    constructor(allowedQualities: string[]) {
        super('Seu plano atual nao permite esta qualidade de render.')
        this.name = 'QualityNotAllowedError'
        this.allowedQualities = allowedQualities
    }
}

export async function getCreditSummary(userId: string): Promise<CreditSummary> {
    await ensureUserCreditSetup(userId)

    const [balance, subscription] = await Promise.all([
        getBalance(userId),
        getActiveSubscription(userId)
    ])

    const plan = await resolvePlan(subscription)

    return {
        allowedQualities: plan.allowed_qualities,
        balance,
        currentPeriodEnd: subscription?.current_period_end ?? null,
        isPaid: plan.is_paid,
        paymentMethod: subscription?.payment_method ?? null,
        planName: plan.name,
        planSlug: plan.slug,
        renews: plan.renews
    }
}

async function resolvePlan(subscription: UserSubscriptionRecord | null): Promise<SubscriptionPlanRecord> {
    const slug = subscription?.plan_slug ?? 'free'
    const plan = await getPlan(slug)

    if (!plan) {
        throw new Error(`Plano "${slug}" nao encontrado.`)
    }

    return plan
}

export async function ensureRenderQualityAllowed(userId: string, quality: AiRenderQuality): Promise<void> {
    const subscription = await getActiveSubscription(userId)
    const plan = await resolvePlan(subscription)

    if (!isQualityAllowed(plan.allowed_qualities, quality)) {
        throw new QualityNotAllowedError(plan.allowed_qualities)
    }
}

export async function reserveCreditsForRender(options: {
    quality: AiRenderQuality
    renderId: string
    userId: string
}): Promise<number> {
    const amount = getRenderCreditCost(options.quality)
    const result = await reserveRenderCredits({ amount, renderId: options.renderId, userId: options.userId })

    if (!result.ok) {
        throw new InsufficientCreditsError(result.balance, amount)
    }

    return result.balance
}

export async function refundCreditsForRender(userId: string, renderId: string): Promise<void> {
    await refundRenderCredits({ renderId, userId })
}

export async function applyPaidCycleForUser(options: {
    currentPeriodEnd: Date | null
    idempotencyKey: string
    paymentMethod: 'CARD' | 'PIX'
    planSlug: string
    providerCustomerId: string | null
    providerSubscriptionId: string | null
    userId: string
}): Promise<void> {
    const plan = await getPlan(options.planSlug)

    if (!plan || !plan.is_paid) {
        throw new Error(`Plano pago "${options.planSlug}" nao encontrado.`)
    }

    await activatePaidCycle({
        currentPeriodEnd: options.currentPeriodEnd,
        idempotencyKey: options.idempotencyKey,
        monthlyCredits: plan.monthly_credits,
        paymentMethod: options.paymentMethod,
        planSlug: plan.slug,
        providerCustomerId: options.providerCustomerId,
        providerSubscriptionId: options.providerSubscriptionId,
        userId: options.userId
    })
}

export async function downgradeToFree(userId: string): Promise<void> {
    await downgradeUserToFree(userId)
}

export async function reconcileExpiredSubscriptions(): Promise<number> {
    const expired = await listExpiredPaidSubscriptions()

    for (const subscription of expired) {
        await downgradeUserToFree(subscription.user_id)
    }

    return expired.length
}
