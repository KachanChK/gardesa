import { Router } from 'express'
import {
    COMPANY_PROFILE_LIMITS,
    defaultCompanyProfile,
    validateCompanyProfilePayload
} from '../../legacy/services/company-profile'

const router = Router()

router.get('/empresa', (_req, res) => {
    const serializedSeed = JSON.stringify({
        company: {
            ...defaultCompanyProfile,
            companyName: 'Gardesa Landscaping',
            email: 'contato@gardesa.com',
            phone: '',
            address: '',
            cnpj: '',
            logoUrl: ''
        },
        limits: COMPANY_PROFILE_LIMITS
    }).replace(/</g, '\\u003c')

    res.render('legacy/empresa', {
        serializedSeed
    })
})

router.post('/empresa/validate', (req, res) => {
    const source = getRecord(req.body).profile ?? req.body
    const result = validateCompanyProfilePayload(source)

    if (Object.keys(result.errors).length > 0) {
        res.status(422).json(result)
        return
    }

    res.json(result)
})

function getRecord(value: unknown): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        return value as Record<string, unknown>
    }

    return {}
}

export default router
