import path from 'path'
import validator from 'validator'

export interface CompanyProfile {
    companyName: string
    email: string
    phone: string
    address: string
    cnpj: string
    logoUrl: string
}

export type CompanyProfileErrors = Partial<Record<keyof CompanyProfile, string>>

export const COMPANY_PROFILE_LIMITS = {
    companyName: 40,
    email: 80,
    phoneDigits: 11,
    address: 150,
    cnpjDigits: 14,
    logoBytes: 1024 * 1024
} as const

const allowedLogoMimeTypes = new Set(['image/png', 'image/jpeg'])
const allowedLogoExtensions = new Set(['.png', '.jpg', '.jpeg'])

export const defaultCompanyProfile: CompanyProfile = {
    companyName: 'Eliana Ranzani Paisagismo',
    email: 'erpaisagismo@gmail.com',
    phone: '(19) 99876-5432',
    address: 'Rua das Ac\u00e1cias, 148 - Vila Bot\u00e2nica, S\u00e3o Paulo - SP',
    cnpj: '12.345.678/0001-90',
    logoUrl: '/img/erpaisagismo.jpg'
}

export function validateCompanyProfilePayload(raw: unknown): {
    profile: CompanyProfile
    errors: CompanyProfileErrors
} {
    const source = getRecord(raw)
    const errors: CompanyProfileErrors = {}

    const companyName = cleanText(source.companyName)
    if (!companyName) {
        errors.companyName = 'Informe o nome da empresa.'
    } else if (companyName.length > COMPANY_PROFILE_LIMITS.companyName) {
        errors.companyName = `O nome da empresa deve ter no m\u00e1ximo ${COMPANY_PROFILE_LIMITS.companyName} caracteres.`
    }

    const email = cleanText(source.email).toLowerCase()
    if (!email || email.length > COMPANY_PROFILE_LIMITS.email || !validator.isEmail(email)) {
        errors.email = 'Informe um e-mail v\u00e1lido da empresa.'
    }

    const phoneDigits = onlyDigits(source.phone)
    if (phoneDigits.length < 10 || phoneDigits.length > COMPANY_PROFILE_LIMITS.phoneDigits) {
        errors.phone = 'Informe um telefone brasileiro com 10 ou 11 d\u00edgitos.'
    }

    const address = cleanText(source.address)
    if (!address) {
        errors.address = 'Informe o endere\u00e7o da empresa.'
    } else if (address.length > COMPANY_PROFILE_LIMITS.address) {
        errors.address = `O endere\u00e7o deve ter no m\u00e1ximo ${COMPANY_PROFILE_LIMITS.address} caracteres.`
    }

    const cnpjDigits = onlyDigits(source.cnpj)
    if (cnpjDigits.length !== COMPANY_PROFILE_LIMITS.cnpjDigits) {
        errors.cnpj = 'Informe um CNPJ com 14 d\u00edgitos.'
    }

    const logoResult = normalizeLogoSource(source.logoUrl)
    if (!logoResult.valid) {
        errors.logoUrl = logoResult.message
    }

    return {
        profile: {
            companyName: limitText(companyName, COMPANY_PROFILE_LIMITS.companyName),
            email: limitText(email, COMPANY_PROFILE_LIMITS.email),
            phone: formatBrazilianPhone(phoneDigits),
            address: limitText(address, COMPANY_PROFILE_LIMITS.address),
            cnpj: formatCnpj(cnpjDigits),
            logoUrl: logoResult.value
        },
        errors
    }
}

export function sanitizeCompanyProfile(raw: unknown): CompanyProfile {
    const source = getRecord(raw)
    const fallback = defaultCompanyProfile
    const phoneDigits = onlyDigits(source.phone)
    const cnpjDigits = onlyDigits(source.cnpj)
    const logoResult = normalizeLogoSource(source.logoUrl)
    const email = cleanText(source.email).toLowerCase()

    return {
        companyName:
            limitText(cleanText(source.companyName), COMPANY_PROFILE_LIMITS.companyName) ||
            fallback.companyName,
        email:
            email && email.length <= COMPANY_PROFILE_LIMITS.email && validator.isEmail(email)
                ? email
                : fallback.email,
        phone:
            phoneDigits.length >= 10 && phoneDigits.length <= COMPANY_PROFILE_LIMITS.phoneDigits
                ? formatBrazilianPhone(phoneDigits)
                : fallback.phone,
        address:
            limitText(cleanText(source.address), COMPANY_PROFILE_LIMITS.address) ||
            fallback.address,
        cnpj:
            cnpjDigits.length === COMPANY_PROFILE_LIMITS.cnpjDigits
                ? formatCnpj(cnpjDigits)
                : fallback.cnpj,
        logoUrl: logoResult.valid ? logoResult.value : fallback.logoUrl
    }
}

export function isAllowedLogoSource(value: string): boolean {
    return normalizeLogoSource(value).valid
}

function normalizeLogoSource(value: unknown): { valid: boolean; value: string; message: string } {
    const source = typeof value === 'string' ? value.trim() : ''

    if (!source) {
        return { valid: true, value: '', message: '' }
    }

    const dataUrlMatch = source.match(/^data:(image\/(?:png|jpeg));base64,([a-z0-9+/=]+)$/i)
    if (dataUrlMatch) {
        const mimeType = dataUrlMatch[1].toLowerCase()
        const base64Payload = dataUrlMatch[2]
        const byteLength = Math.floor((base64Payload.length * 3) / 4)

        if (!allowedLogoMimeTypes.has(mimeType)) {
            return {
                valid: false,
                value: '',
                message: 'Envie uma logo nos formatos PNG, JPG ou JPEG.'
            }
        }

        if (!hasExpectedImageSignature(mimeType, base64Payload)) {
            return {
                valid: false,
                value: '',
                message: 'A logo deve ser um arquivo PNG, JPG ou JPEG v\u00e1lido.'
            }
        }

        if (byteLength > COMPANY_PROFILE_LIMITS.logoBytes) {
            return {
                valid: false,
                value: '',
                message: 'A logo deve ter no m\u00e1ximo 1 MB.'
            }
        }

        return {
            valid: true,
            value: `data:${mimeType};base64,${base64Payload}`,
            message: ''
        }
    }

    if (source.startsWith('/img/')) {
        const normalizedPath = path.posix.normalize(source)
        const extension = path.posix.extname(normalizedPath).toLowerCase()

        if (
            normalizedPath.startsWith('/img/') &&
            !normalizedPath.includes('..') &&
            allowedLogoExtensions.has(extension)
        ) {
            return { valid: true, value: normalizedPath, message: '' }
        }
    }

    return {
        valid: false,
        value: '',
        message: 'A logo deve ser um arquivo PNG, JPG ou JPEG v\u00e1lido.'
    }
}

function cleanText(value: unknown): string {
    if (typeof value !== 'string') {
        return ''
    }

    return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
}

function limitText(value: string, maxLength: number): string {
    return value.slice(0, maxLength)
}

function onlyDigits(value: unknown): string {
    return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function formatBrazilianPhone(digits: string): string {
    if (digits.length === 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }

    if (digits.length === 11) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    }

    return ''
}

function formatCnpj(digits: string): string {
    if (digits.length !== COMPANY_PROFILE_LIMITS.cnpjDigits) {
        return ''
    }

    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`
}

function hasExpectedImageSignature(mimeType: string, base64Payload: string): boolean {
    if (mimeType === 'image/png') {
        return base64Payload.startsWith('iVBORw0KGgo')
    }

    if (mimeType === 'image/jpeg') {
        return base64Payload.startsWith('/9j/')
    }

    return false
}

function getRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }

    return {}
}
