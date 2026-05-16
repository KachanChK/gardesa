import { readFileSync } from 'fs'
import path from 'path'
import { Router, type Application, type Request } from 'express'
import puppeteer, { type Browser } from 'puppeteer'
import {
    budgetSeedPayload,
    type Budget,
    type BudgetClient,
    type BudgetItem,
    type BudgetProfile,
    type PaymentMethodKey
} from '../../legacy/mock/orcamentos'
import { isAllowedLogoSource, sanitizeCompanyProfile } from '../../legacy/services/company-profile'

const router = Router()

const ITEM_PAGE_SIZE = 11
const MAX_BUDGET_ITEMS = 20
const MAX_BUDGET_NAME_LENGTH = 50
const MAX_PROJECT_DESCRIPTION_LENGTH = 400
const MAX_ITEM_DESCRIPTION_LENGTH = 80
const MAX_CUSTOM_UNIT_LENGTH = 10
const MAX_OTHER_PAYMENT_LENGTH = 20
const MAX_PAYMENT_CONDITIONS_LENGTH = 250
const MAX_OBSERVATIONS_LENGTH = 250
const MAX_ITEM_QUANTITY = 999
const MAX_UNIT_PRICE = 999999
const MAX_TOTAL_AMOUNT = 999999999.99
const OUTPUT_CSS_PATH = path.join(__dirname, '../../../public/css/output.css')

interface RenderableBudgetItem {
    sequence: number
    description: string
    quantityLabel: string
    unitLabel: string
    subtotal: number
    subtotalLabel: string
}

interface BudgetDocumentViewModel {
    baseUrl: string
    inlineStyles: string
    renderMode: 'preview' | 'export'
    profile: BudgetProfile
    client: BudgetClient | null
    budget: Budget
    itemPages: RenderableBudgetItem[][]
    total: number
    totalLabel: string
    computedTotalLabel: string
    overrideActive: boolean
    validityLabel: string
    paymentMethodLabels: string[]
    issuedAtLabel: string
    generatedAtLabel: string
    pageCount: number
}

const paymentMethodLabels: Record<PaymentMethodKey, string> = {
    pix: 'Pix',
    credit: 'Cartão de crédito',
    debit: 'Cartão de débito',
    transfer: 'Transferência',
    boleto: 'Boleto',
    other: 'Outro'
}

router.get('/orcamentos', (_req, res) => {
    const serializedSeed = JSON.stringify(budgetSeedPayload).replace(/</g, '\\u003c')

    res.render('legacy/orcamentos', {
        serializedSeed
    })
})

router.post('/orcamentos/preview', async (req, res) => {
    try {
        const html = await renderBudgetDocumentHtml(req, 'preview')

        res.setHeader('Cache-Control', 'no-store')
        res.type('html').send(html)
    } catch (error) {
        console.error('[Orçamentos] Erro ao gerar preview:', error)
        res.status(500).send('<p>Não foi possível gerar o preview do PDF.</p>')
    }
})

router.post('/orcamentos/export', async (req, res) => {
    let browser: Browser | null = null

    try {
        const html = await renderBudgetDocumentHtml(req, 'export')
        const budget = normalizeBudget(getRecord(req.body).budget)
        const fileName = `${slugify(budget.name || `orcamento-${budget.number}`) || `orcamento-${budget.number}`}.pdf`

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        await page.setViewport({ width: 1440, height: 1900, deviceScaleFactor: 1 })
        await page.setContent(html, { waitUntil: 'networkidle0' })
        await page.emulateMediaType('screen')
        await page.evaluate(async () => {
            await document.fonts.ready
        })

        const pdfBuffer = await page.pdf({
            format: 'A4',
            preferCSSPageSize: true,
            printBackground: true,
            margin: {
                top: '0',
                right: '0',
                bottom: '0',
                left: '0'
            }
        })

        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
        res.send(pdfBuffer)
    } catch (error) {
        console.error('[Orçamentos] Erro ao exportar PDF:', error)
        res.status(500).json({
            message: 'Não foi possível exportar o orçamento em PDF.'
        })
    } finally {
        if (browser) {
            await browser.close()
        }
    }
})

async function renderBudgetDocumentHtml(
    req: Request,
    renderMode: BudgetDocumentViewModel['renderMode']
): Promise<string> {
    const model = buildBudgetDocumentViewModel(req, renderMode)

    return renderView(req.app, 'legacy/partials/orcamentos-pdf', {
        doc: model
    })
}

function buildBudgetDocumentViewModel(
    req: Request,
    renderMode: BudgetDocumentViewModel['renderMode']
): BudgetDocumentViewModel {
    const body = getRecord(req.body)
    const baseUrl = `${req.protocol}://${req.get('host') ?? 'localhost:3000'}`
    const inlineStyles = loadDocumentStyles()
    const profile = resolveDocumentProfile(normalizeProfile(body.profile), baseUrl)
    const client = normalizeClient(body.client)
    const budget = normalizeBudget(body.budget)

    const items = budget.items
        .filter((item) =>
            Boolean(
                item.description.trim() ||
                    item.quantity.trim() ||
                    item.unitPrice.trim() ||
                    item.customUnit.trim()
            )
        )
        .map<RenderableBudgetItem>((item, index) => {
            const subtotal = calculateSubtotal(item)

            return {
                sequence: index + 1,
                description: item.description.trim() || 'Item sem descrição',
                quantityLabel: formatQuantity(item.quantity),
                unitLabel: resolveUnitLabel(item),
                subtotal,
                subtotalLabel: formatCurrency(subtotal)
            }
        })

    const safeItems =
        items.length > 0
            ? items
            : [
                  {
                      sequence: 1,
                      description: 'Nenhum item adicionado',
                      quantityLabel: '—',
                      unitLabel: '—',
                      subtotal: 0,
                      subtotalLabel: formatCurrency(0)
                  }
              ]

    const itemPages = chunkArray(safeItems, ITEM_PAGE_SIZE)
    const computedTotal = clampAmount(
        budget.items.reduce((total, item) => total + calculateSubtotal(item), 0),
        MAX_TOTAL_AMOUNT
    )
    const overrideValue = clampAmount(parseAmount(budget.totalOverride), MAX_TOTAL_AMOUNT)
    const overrideActive = budget.totalOverride.trim().length > 0 && overrideValue > 0
    const total = overrideActive ? overrideValue : computedTotal
    const paymentMethodKeys = budget.paymentMethods.filter((value) => value in paymentMethodLabels)
    const paymentMethodValues = paymentMethodKeys.flatMap((value) => {
        if (value === 'other') {
            return budget.otherPaymentMethod.trim() ? [budget.otherPaymentMethod.trim()] : []
        }

        return [paymentMethodLabels[value]]
    })

    return {
        baseUrl,
        inlineStyles,
        renderMode,
        profile,
        client,
        budget,
        itemPages,
        total,
        totalLabel: formatCurrency(total),
        computedTotalLabel: formatCurrency(computedTotal),
        overrideActive,
        validityLabel: budget.validityDate ? formatDate(budget.validityDate) : 'Não informada',
        paymentMethodLabels: paymentMethodValues,
        issuedAtLabel: formatDate(budget.createdAt),
        generatedAtLabel: formatDate(new Date().toISOString()),
        pageCount: itemPages.length + 3
    }
}

function loadDocumentStyles(): string {
    try {
        const baseStyles = readFileSync(OUTPUT_CSS_PATH, 'utf8')

        return `${baseStyles}

@page {
    size: A4 portrait;
    margin: 0;
}

html, body {
    margin: 0;
    padding: 0;
}

body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}
`
    } catch (error) {
        console.error('[Orçamentos] Erro ao carregar CSS do documento:', error)
        return ''
    }
}

function resolveDocumentProfile(profile: BudgetProfile, baseUrl: string): BudgetProfile {
    return {
        ...profile,
        logoUrl: resolveAssetSource(profile.logoUrl, baseUrl)
    }
}

function resolveAssetSource(assetUrl: string, baseUrl: string): string {
    if (!assetUrl) {
        return ''
    }

    if (!isAllowedLogoSource(assetUrl)) {
        return ''
    }

    if (assetUrl.startsWith('data:image/png;base64,') || assetUrl.startsWith('data:image/jpeg;base64,')) {
        return assetUrl
    }

    if (assetUrl.startsWith('/')) {
        const publicRelativePath = path.normalize(assetUrl.replace(/^\//, ''))

        if (publicRelativePath.startsWith('..') || path.isAbsolute(publicRelativePath)) {
            return ''
        }

        const assetPath = path.join(__dirname, '../../../public', publicRelativePath)

        try {
            const fileBuffer = readFileSync(assetPath)
            const extension = path.extname(assetPath).toLowerCase()
            const mimeType =
                extension === '.png'
                    ? 'image/png'
                    : extension === '.jpg' || extension === '.jpeg'
                      ? 'image/jpeg'
                      : 'application/octet-stream'

            if (mimeType === 'application/octet-stream') {
                return ''
            }

            return `data:${mimeType};base64,${fileBuffer.toString('base64')}`
        } catch (error) {
            console.error('[Orcamentos] Erro ao carregar asset do documento:', error)
        }
    }

    return ''
}

function normalizeProfile(raw: unknown): BudgetProfile {
    const source = getRecord(raw)
    const defaults = budgetSeedPayload.profile
    const companyProfile = sanitizeCompanyProfile(source)
    const paymentMethods = normalizePaymentMethods(source.defaultPaymentMethods)

    return {
        ...companyProfile,
        defaultPaymentMethods: paymentMethods.length ? paymentMethods : defaults.defaultPaymentMethods,
        defaultPaymentConditions: stringValue(
            source.defaultPaymentConditions,
            defaults.defaultPaymentConditions
        )
    }
}

function normalizeClient(raw: unknown): BudgetClient | null {
    if (!raw) {
        return null
    }

    const source = getRecord(raw)

    if (!Object.keys(source).length) {
        return null
    }

    return {
        id: numberValue(source.id, 0),
        name: stringValue(source.name),
        email: stringValue(source.email),
        phone: stringValue(source.phone),
        address: stringValue(source.address),
        document: stringValue(source.document)
    }
}

function normalizeBudget(raw: unknown): Budget {
    const source = getRecord(raw)
    const fallback = budgetSeedPayload.budgets[0]

    return {
        id: numberValue(source.id, fallback.id),
        number: numberValue(source.number, fallback.number),
        name: limitTextValue(stringValue(source.name, fallback.name), MAX_BUDGET_NAME_LENGTH),
        clientId: numberValue(source.clientId, fallback.clientId),
        description: limitTextValue(
            stringValue(source.description),
            MAX_PROJECT_DESCRIPTION_LENGTH
        ),
        status: normalizeStatus(source.status),
        createdAt: stringValue(source.createdAt, new Date().toISOString()),
        updatedAt: stringValue(source.updatedAt, new Date().toISOString()),
        showValuesInPdf: booleanValue(source.showValuesInPdf, false),
        totalOverride: normalizeCurrencyString(source.totalOverride, MAX_TOTAL_AMOUNT),
        validityDate: stringValue(source.validityDate),
        paymentMethods: normalizePaymentMethods(source.paymentMethods),
        otherPaymentMethod: limitTextValue(
            stringValue(source.otherPaymentMethod),
            MAX_OTHER_PAYMENT_LENGTH
        ),
        paymentConditions: limitTextValue(
            stringValue(source.paymentConditions),
            MAX_PAYMENT_CONDITIONS_LENGTH
        ),
        observations: limitTextValue(
            stringValue(source.observations),
            MAX_OBSERVATIONS_LENGTH
        ),
        items: arrayValue(source.items)
            .slice(0, MAX_BUDGET_ITEMS)
            .map((item, index) => normalizeItem(item, index + 1))
    }
}

function normalizeItem(raw: unknown, index: number): BudgetItem {
    const source = getRecord(raw)

    return {
        id: stringValue(source.id, `item-${index}`),
        itemId: nullableNumberValue(source.itemId),
        description: limitTextValue(stringValue(source.description), MAX_ITEM_DESCRIPTION_LENGTH),
        quantity: normalizeQuantityString(source.quantity),
        unit: stringValue(source.unit, 'un'),
        customUnit: limitTextValue(stringValue(source.customUnit), MAX_CUSTOM_UNIT_LENGTH),
        unitPrice: normalizeCurrencyString(source.unitPrice, MAX_UNIT_PRICE)
    }
}

function normalizeStatus(value: unknown): Budget['status'] {
    const allowedStatuses: Budget['status'][] = ['Rascunho', 'Enviado', 'Aprovado', 'Recusado']

    return allowedStatuses.includes(value as Budget['status']) ? (value as Budget['status']) : 'Rascunho'
}

function normalizePaymentMethods(value: unknown): PaymentMethodKey[] {
    return arrayValue(value).filter(
        (entry): entry is PaymentMethodKey =>
            typeof entry === 'string' && entry in paymentMethodLabels
    )
}

function limitTextValue(value: string, maxLength: number): string {
    return value.slice(0, maxLength)
}

function normalizeQuantityString(value: unknown): string {
    const amount = clampAmount(parseAmount(stringValue(value)), MAX_ITEM_QUANTITY)
    return amount > 0 ? trimTrailingZeros(amount) : ''
}

function normalizeCurrencyString(value: unknown, maxValue: number): string {
    const amount = clampAmount(parseAmount(stringValue(value)), maxValue)
    return amount > 0 ? amount.toFixed(2) : ''
}

function trimTrailingZeros(value: number): string {
    return value
        .toFixed(2)
        .replace(/\.00$/, '')
        .replace(/(\.\d)0$/, '$1')
}

function clampAmount(value: number, maxValue: number): number {
    if (!Number.isFinite(value)) {
        return 0
    }

    return Math.min(Math.max(value, 0), maxValue)
}

function renderView(
    app: Application,
    view: string,
    locals: Record<string, unknown>
): Promise<string> {
    return new Promise((resolve, reject) => {
        app.render(view, locals, (error, html) => {
            if (error) {
                reject(error)
                return
            }

            resolve(html)
        })
    })
}

function calculateSubtotal(item: BudgetItem): number {
    return clampAmount(
        clampAmount(parseAmount(item.quantity), MAX_ITEM_QUANTITY) *
            clampAmount(parseAmount(item.unitPrice), MAX_UNIT_PRICE),
        MAX_TOTAL_AMOUNT
    )
}

function parseAmount(value: string): number {
    if (!value.trim()) {
        return 0
    }

    const withoutCurrency = value.replace(/[R$\s]/g, '')
    const normalized = withoutCurrency.includes(',')
        ? withoutCurrency.replace(/\./g, '').replace(',', '.')
        : withoutCurrency.replace(',', '.')
    const amount = Number.parseFloat(normalized)

    return Number.isFinite(amount) ? amount : 0
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value)
}

function formatDate(value: string): string {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Não informada'
    }

    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date)
}

function formatQuantity(value: string): string {
    const amount = parseAmount(value)

    if (amount <= 0) {
        return '—'
    }

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    }).format(amount)
}

function resolveUnitLabel(item: BudgetItem): string {
    if (item.unit === 'custom') {
        return item.customUnit.trim() || 'Unidade personalizada'
    }

    return item.unit
}

function chunkArray<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size))
    }

    return chunks
}

function slugify(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function getRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }

    return {}
}

function arrayValue(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
}

function stringValue(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback
}

function numberValue(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10)
        return Number.isFinite(parsed) ? parsed : fallback
    }

    return fallback
}

function nullableNumberValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
        return null
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10)
        return Number.isFinite(parsed) ? parsed : null
    }

    return null
}

function booleanValue(value: unknown, fallback: boolean): boolean {
    if (typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'string') {
        return value === 'true'
    }

    return fallback
}

export default router
