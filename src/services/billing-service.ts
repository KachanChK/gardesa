import { cancelSubscription, createCheckout, createCustomer, createSubscription } from './abacatepay'
import {
    createPendingSubscription,
    getActiveSubscription,
    getPaymentCustomer,
    getPlan,
    upsertPaymentCustomer
} from './credits-repository'

function getAppUrl(): string {
    const appUrl = process.env.APP_URL ?? process.env.AUTH_URL

    if (!appUrl) {
        throw new Error('APP_URL e obrigatoria para gerar os links de checkout.')
    }

    return appUrl.replace(/\/+$/, '')
}

async function ensureCustomerId(options: {
    email: string
    name: string
    taxId: string
    userId: string
}): Promise<string> {
    const existing = await getPaymentCustomer(options.userId)

    if (existing) {
        await upsertPaymentCustomer({
            providerCustomerId: existing.provider_customer_id,
            taxId: options.taxId,
            userId: options.userId
        })

        return existing.provider_customer_id
    }

    const customer = await createCustomer({
        email: options.email,
        name: options.name || 'Cliente Gardesa',
        taxId: options.taxId
    })

    await upsertPaymentCustomer({
        providerCustomerId: customer.id,
        taxId: options.taxId,
        userId: options.userId
    })

    return customer.id
}

export async function createPlanCheckout(options: {
    email: string
    name: string
    paymentMethod: 'CARD' | 'PIX'
    planSlug: string
    taxId: string
    userId: string
}): Promise<string> {
    if (!options.email) {
        throw new Error('Nao foi possivel identificar seu e-mail para o checkout.')
    }

    const plan = await getPlan(options.planSlug)

    if (!plan || !plan.is_paid) {
        throw new Error('Plano invalido.')
    }

    const activeSubscription = await getActiveSubscription(options.userId)

    if (activeSubscription) {
        const activePlan = await getPlan(activeSubscription.plan_slug)

        if (activePlan?.is_paid && activeSubscription.plan_slug === plan.slug) {
            throw new Error('Voce ja assina este plano.')
        }

        if (activePlan?.is_paid && activeSubscription.payment_method === 'CARD' && activeSubscription.provider_subscription_id) {
            await cancelSubscription(activeSubscription.provider_subscription_id).catch(() => undefined)
        }
    }

    const customerId = await ensureCustomerId({
        email: options.email,
        name: options.name,
        taxId: options.taxId,
        userId: options.userId
    })

    const appUrl = getAppUrl()
    const externalId = `${options.userId}:${plan.slug}:${Date.now()}`
    const metadata = {
        paymentMethod: options.paymentMethod,
        planSlug: plan.slug,
        userId: options.userId
    }
    const charge = {
        completionUrl: `${appUrl}/member/billing?status=success`,
        customerId,
        externalId,
        metadata,
        returnUrl: `${appUrl}/member/billing`
    }

    if (options.paymentMethod === 'CARD') {
        if (!plan.provider_product_id) {
            throw new Error('Produto deste plano ainda nao foi configurado no gateway.')
        }

        const subscription = await createSubscription({
            ...charge,
            items: [{ id: plan.provider_product_id, quantity: 1 }],
            methods: ['CARD']
        })

        await createPendingSubscription({
            paymentMethod: 'CARD',
            planSlug: plan.slug,
            providerCustomerId: customerId,
            providerSubscriptionId: subscription.id,
            userId: options.userId
        })

        return subscription.url
    }

    const checkout = await createCheckout({
        ...charge,
        items: [
            {
                externalId: plan.external_id,
                name: plan.name,
                price: plan.price_cents,
                quantity: 1
            }
        ],
        methods: ['PIX']
    })

    await createPendingSubscription({
        paymentMethod: 'PIX',
        planSlug: plan.slug,
        providerCustomerId: customerId,
        providerSubscriptionId: checkout.id,
        userId: options.userId
    })

    return checkout.url
}
