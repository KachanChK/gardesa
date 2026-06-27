import type { PoolClient } from 'pg'
import { db } from '../config/database'

export interface SubscriptionPlanRecord {
    slug: string
    name: string
    price_cents: number
    monthly_credits: number
    renews: boolean
    is_paid: boolean
    allowed_qualities: string[]
    external_id: string | null
    cycle: string | null
    provider_product_id: string | null
    sort_order: number
}

export interface UserSubscriptionRecord {
    id: string
    user_id: string
    plan_slug: string
    status: 'pending' | 'active' | 'cancelled' | 'expired'
    payment_method: 'CARD' | 'PIX' | null
    provider: string
    provider_subscription_id: string | null
    provider_customer_id: string | null
    current_period_end: Date | null
    cancel_at_period_end: boolean
    created_at: Date
    updated_at: Date
}

export interface CreditContext {
    balance: number
    plan: SubscriptionPlanRecord
    subscription: UserSubscriptionRecord | null
}

type CreditTransactionType = 'free_grant' | 'subscription_grant' | 'consume' | 'refund' | 'adjustment'

async function withTransaction<T>(handler: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await db.connect()

    try {
        await client.query('BEGIN')
        const result = await handler(client)
        await client.query('COMMIT')
        return result
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

async function lockUser(client: PoolClient, userId: string): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [userId])
}

async function ensureBalanceRow(client: PoolClient, userId: string): Promise<void> {
    await client.query(
        'INSERT INTO user_credit_balances (user_id, balance) VALUES ($1, 0) ON CONFLICT (user_id) DO NOTHING',
        [userId]
    )
}

async function transactionExists(client: PoolClient, idempotencyKey: string): Promise<boolean> {
    const result = await client.query(
        'SELECT 1 FROM credit_transactions WHERE idempotency_key = $1 LIMIT 1',
        [idempotencyKey]
    )

    return result.rowCount !== null && result.rowCount > 0
}

export async function getPlan(slug: string): Promise<SubscriptionPlanRecord | null> {
    const result = await db.query<SubscriptionPlanRecord>(
        'SELECT * FROM subscription_plans WHERE slug = $1 LIMIT 1',
        [slug]
    )

    return result.rows[0] ?? null
}

export async function listPlans(): Promise<SubscriptionPlanRecord[]> {
    const result = await db.query<SubscriptionPlanRecord>(
        'SELECT * FROM subscription_plans ORDER BY sort_order ASC'
    )

    return result.rows
}

export async function getActiveSubscription(userId: string): Promise<UserSubscriptionRecord | null> {
    const result = await db.query<UserSubscriptionRecord>(
        "SELECT * FROM user_subscriptions WHERE user_id = $1 AND status = 'active' LIMIT 1",
        [userId]
    )

    return result.rows[0] ?? null
}

export async function getBalance(userId: string): Promise<number> {
    const result = await db.query<{ balance: number }>(
        'SELECT balance FROM user_credit_balances WHERE user_id = $1 LIMIT 1',
        [userId]
    )

    return result.rows[0]?.balance ?? 0
}

export async function ensureUserCreditSetup(userId: string): Promise<void> {
    await withTransaction(async (client) => {
        await lockUser(client, userId)
        await ensureBalanceRow(client, userId)

        const existing = await client.query(
            'SELECT 1 FROM user_subscriptions WHERE user_id = $1 LIMIT 1',
            [userId]
        )

        if (existing.rowCount !== null && existing.rowCount > 0) {
            return
        }

        await client.query(
            "INSERT INTO user_subscriptions (user_id, plan_slug, status) VALUES ($1, 'free', 'active')",
            [userId]
        )

        const plan = await client.query<{ monthly_credits: number }>(
            "SELECT monthly_credits FROM subscription_plans WHERE slug = 'free' LIMIT 1",
            []
        )
        const freeCredits = plan.rows[0]?.monthly_credits ?? 0

        await applyBalanceSet(client, {
            balanceTarget: freeCredits,
            idempotencyKey: `free_grant:${userId}`,
            type: 'free_grant',
            userId
        })
    })
}

async function applyBalanceSet(client: PoolClient, options: {
    balanceTarget: number
    idempotencyKey: string
    type: CreditTransactionType
    userId: string
    metadata?: Record<string, unknown>
}): Promise<void> {
    if (await transactionExists(client, options.idempotencyKey)) {
        return
    }

    await ensureBalanceRow(client, options.userId)

    const current = await client.query<{ balance: number }>(
        'SELECT balance FROM user_credit_balances WHERE user_id = $1 FOR UPDATE',
        [options.userId]
    )
    const balanceBefore = current.rows[0]?.balance ?? 0
    const balanceAfter = options.balanceTarget
    const amount = balanceAfter - balanceBefore

    await client.query(
        'UPDATE user_credit_balances SET balance = $2, updated_at = now() WHERE user_id = $1',
        [options.userId, balanceAfter]
    )

    await client.query(
        `INSERT INTO credit_transactions
            (user_id, type, amount, balance_before, balance_after, idempotency_key, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (idempotency_key) DO NOTHING`,
        [
            options.userId,
            options.type,
            amount,
            balanceBefore,
            balanceAfter,
            options.idempotencyKey,
            options.metadata ? JSON.stringify(options.metadata) : null
        ]
    )
}

export async function reserveRenderCredits(options: {
    amount: number
    renderId: string
    userId: string
}): Promise<{ ok: boolean, balance: number }> {
    return withTransaction(async (client) => {
        await lockUser(client, options.userId)
        await ensureBalanceRow(client, options.userId)

        const idempotencyKey = `consume:render:${options.renderId}`

        if (await transactionExists(client, idempotencyKey)) {
            return { balance: await readBalance(client, options.userId), ok: true }
        }

        const debit = await client.query<{ balance: number }>(
            `UPDATE user_credit_balances
            SET balance = balance - $2, updated_at = now()
            WHERE user_id = $1 AND balance >= $2
            RETURNING balance`,
            [options.userId, options.amount]
        )

        if (debit.rowCount === 0) {
            return { balance: await readBalance(client, options.userId), ok: false }
        }

        const balanceAfter = debit.rows[0].balance
        const balanceBefore = balanceAfter + options.amount

        await client.query(
            `INSERT INTO credit_transactions
                (user_id, type, amount, balance_before, balance_after, idempotency_key, render_id)
            VALUES ($1, 'consume', $2, $3, $4, $5, $6)`,
            [options.userId, -options.amount, balanceBefore, balanceAfter, idempotencyKey, options.renderId]
        )

        return { balance: balanceAfter, ok: true }
    })
}

export async function refundRenderCredits(options: {
    renderId: string
    userId: string
}): Promise<void> {
    await withTransaction(async (client) => {
        await lockUser(client, options.userId)

        const consumeKey = `consume:render:${options.renderId}`
        const refundKey = `refund:render:${options.renderId}`

        const consume = await client.query<{ amount: number }>(
            'SELECT amount FROM credit_transactions WHERE idempotency_key = $1 LIMIT 1',
            [consumeKey]
        )

        if (consume.rowCount === 0) {
            return
        }

        if (await transactionExists(client, refundKey)) {
            return
        }

        const amount = Math.abs(consume.rows[0].amount)

        await ensureBalanceRow(client, options.userId)

        const updated = await client.query<{ balance: number }>(
            'UPDATE user_credit_balances SET balance = balance + $2, updated_at = now() WHERE user_id = $1 RETURNING balance',
            [options.userId, amount]
        )
        const balanceAfter = updated.rows[0].balance
        const balanceBefore = balanceAfter - amount

        await client.query(
            `INSERT INTO credit_transactions
                (user_id, type, amount, balance_before, balance_after, idempotency_key, render_id)
            VALUES ($1, 'refund', $2, $3, $4, $5, $6)
            ON CONFLICT (idempotency_key) DO NOTHING`,
            [options.userId, amount, balanceBefore, balanceAfter, refundKey, options.renderId]
        )
    })
}

async function readBalance(client: PoolClient, userId: string): Promise<number> {
    const result = await client.query<{ balance: number }>(
        'SELECT balance FROM user_credit_balances WHERE user_id = $1 LIMIT 1',
        [userId]
    )

    return result.rows[0]?.balance ?? 0
}

export async function getPaymentCustomer(userId: string): Promise<{ provider_customer_id: string, tax_id: string | null } | null> {
    const result = await db.query<{ provider_customer_id: string, tax_id: string | null }>(
        'SELECT provider_customer_id, tax_id FROM payment_customers WHERE user_id = $1 LIMIT 1',
        [userId]
    )

    return result.rows[0] ?? null
}

export async function upsertPaymentCustomer(options: {
    providerCustomerId: string
    taxId: string | null
    userId: string
}): Promise<void> {
    await db.query(
        `INSERT INTO payment_customers (user_id, provider_customer_id, tax_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO UPDATE
        SET provider_customer_id = EXCLUDED.provider_customer_id,
            tax_id = EXCLUDED.tax_id,
            updated_at = now()`,
        [options.userId, options.providerCustomerId, options.taxId]
    )
}

export async function createPendingSubscription(options: {
    paymentMethod: 'CARD' | 'PIX'
    planSlug: string
    providerCustomerId: string | null
    providerSubscriptionId: string | null
    userId: string
}): Promise<string> {
    const result = await db.query<{ id: string }>(
        `INSERT INTO user_subscriptions
            (user_id, plan_slug, status, payment_method, provider_customer_id, provider_subscription_id)
        VALUES ($1, $2, 'pending', $3, $4, $5)
        RETURNING id`,
        [
            options.userId,
            options.planSlug,
            options.paymentMethod,
            options.providerCustomerId,
            options.providerSubscriptionId
        ]
    )

    return result.rows[0].id
}

export async function activatePaidCycle(options: {
    currentPeriodEnd: Date | null
    idempotencyKey: string
    monthlyCredits: number
    paymentMethod: 'CARD' | 'PIX'
    planSlug: string
    providerCustomerId: string | null
    providerSubscriptionId: string | null
    userId: string
}): Promise<void> {
    await withTransaction(async (client) => {
        await lockUser(client, options.userId)

        await client.query(
            `UPDATE user_subscriptions
            SET status = 'expired', updated_at = now()
            WHERE user_id = $1 AND status IN ('active', 'pending')`,
            [options.userId]
        )

        await client.query(
            `INSERT INTO user_subscriptions
                (user_id, plan_slug, status, payment_method, provider_customer_id, provider_subscription_id, current_period_end)
            VALUES ($1, $2, 'active', $3, $4, $5, $6)`,
            [
                options.userId,
                options.planSlug,
                options.paymentMethod,
                options.providerCustomerId,
                options.providerSubscriptionId,
                options.currentPeriodEnd
            ]
        )

        await applyBalanceSet(client, {
            balanceTarget: options.monthlyCredits,
            idempotencyKey: options.idempotencyKey,
            metadata: { planSlug: options.planSlug },
            type: 'subscription_grant',
            userId: options.userId
        })
    })
}

export async function downgradeUserToFree(userId: string): Promise<void> {
    await withTransaction(async (client) => {
        await lockUser(client, userId)

        await client.query(
            `UPDATE user_subscriptions
            SET status = 'expired', updated_at = now()
            WHERE user_id = $1 AND status IN ('active', 'pending')`,
            [userId]
        )

        await client.query(
            "INSERT INTO user_subscriptions (user_id, plan_slug, status) VALUES ($1, 'free', 'active')",
            [userId]
        )
    })
}

export async function markSubscriptionCancelled(options: {
    cancelAtPeriodEnd: boolean
    providerSubscriptionId: string
}): Promise<void> {
    await db.query(
        `UPDATE user_subscriptions
        SET cancel_at_period_end = $2, updated_at = now()
        WHERE provider_subscription_id = $1 AND status = 'active'`,
        [options.providerSubscriptionId, options.cancelAtPeriodEnd]
    )
}

export async function findUserBySubscriptionId(providerSubscriptionId: string): Promise<string | null> {
    const result = await db.query<{ user_id: string }>(
        'SELECT user_id FROM user_subscriptions WHERE provider_subscription_id = $1 ORDER BY created_at DESC LIMIT 1',
        [providerSubscriptionId]
    )

    return result.rows[0]?.user_id ?? null
}

export async function listActivePaidSubscriptions(): Promise<UserSubscriptionRecord[]> {
    const result = await db.query<UserSubscriptionRecord>(
        `SELECT s.* FROM user_subscriptions s
        JOIN subscription_plans p ON p.slug = s.plan_slug
        WHERE s.status = 'active' AND p.is_paid = true`
    )

    return result.rows
}

export async function listExpiredPaidSubscriptions(): Promise<UserSubscriptionRecord[]> {
    const result = await db.query<UserSubscriptionRecord>(
        `SELECT s.* FROM user_subscriptions s
        JOIN subscription_plans p ON p.slug = s.plan_slug
        WHERE s.status = 'active'
            AND p.is_paid = true
            AND s.current_period_end IS NOT NULL
            AND s.current_period_end < now()`
    )

    return result.rows
}

export async function recordPaymentEvent(options: {
    eventId: string
    eventType: string
    payload: unknown
}): Promise<boolean> {
    const result = await db.query(
        `INSERT INTO payment_events (event_id, event_type, payload)
        VALUES ($1, $2, $3)
        ON CONFLICT (provider, event_id) DO NOTHING`,
        [options.eventId, options.eventType, JSON.stringify(options.payload)]
    )

    return result.rowCount !== null && result.rowCount > 0
}

export async function markPaymentEvent(eventId: string, status: 'processed' | 'failed'): Promise<void> {
    await db.query(
        'UPDATE payment_events SET status = $2, processed_at = now() WHERE event_id = $1',
        [eventId, status]
    )
}

export async function setPlanProviderProductId(slug: string, providerProductId: string): Promise<void> {
    await db.query(
        'UPDATE subscription_plans SET provider_product_id = $2, updated_at = now() WHERE slug = $1',
        [slug, providerProductId]
    )
}
