import dotenv from 'dotenv'
dotenv.config()

import { createProduct } from '../services/abacatepay'
import { listPlans, setPlanProviderProductId } from '../services/credits-repository'
import { closeDatabaseConnection } from '../config/database'

type AbacatePayCycle = 'WEEKLY' | 'MONTHLY' | 'SEMIANNUALLY' | 'ANNUALLY'

function isCycle(value: string | null): value is AbacatePayCycle {
    return value === 'WEEKLY' || value === 'MONTHLY' || value === 'SEMIANNUALLY' || value === 'ANNUALLY'
}

async function main(): Promise<void> {
    const plans = await listPlans()
    const paidPlans = plans.filter((plan) => plan.is_paid && plan.external_id)

    for (const plan of paidPlans) {
        if (plan.provider_product_id) {
            console.log(`[AbacatePay] Plano "${plan.slug}" ja possui produto (${plan.provider_product_id}). Pulando.`)
            continue
        }

        if (!plan.external_id || !isCycle(plan.cycle)) {
            console.warn(`[AbacatePay] Plano "${plan.slug}" sem externalId/cycle valido. Pulando.`)
            continue
        }

        const product = await createProduct({
            cycle: plan.cycle,
            externalId: plan.external_id,
            name: `Gardesa ${plan.name}`,
            priceCents: plan.price_cents
        })

        await setPlanProviderProductId(plan.slug, product.id)
        console.log(`[AbacatePay] Plano "${plan.slug}" vinculado ao produto ${product.id}.`)
    }
}

main()
    .then(() => closeDatabaseConnection())
    .then(() => {
        console.log('[AbacatePay] Setup concluido.')
        process.exit(0)
    })
    .catch(async (error) => {
        console.error('[AbacatePay] Erro no setup:', error)
        await closeDatabaseConnection().catch(() => undefined)
        process.exit(1)
    })
