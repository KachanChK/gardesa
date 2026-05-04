(function () {
    const STORAGE_KEY = 'gardesa:empresa:profile:v1'
    const LEGACY_PROFILE_KEY = 'gardesa:orcamentos:profile:v1'
    const MAX_LOGO_SIZE_BYTES = 1024 * 1024

    const LIMITS = {
        companyName: 40,
        email: 80,
        address: 150,
        phoneDigits: 11,
        cnpjDigits: 14,
        logoBytes: MAX_LOGO_SIZE_BYTES
    }

    const allowedLogoMimeTypes = new Set(['image/png', 'image/jpeg'])
    const allowedLogoExtensions = ['.png', '.jpg', '.jpeg']

    function loadCompany(fallbackCompany) {
        const fallback = normalizeCompany(fallbackCompany)

        try {
            const storedValue = window.localStorage.getItem(STORAGE_KEY)
            if (storedValue) {
                return normalizeCompany(JSON.parse(storedValue), fallback)
            }

            const legacyValue = window.localStorage.getItem(LEGACY_PROFILE_KEY)
            if (legacyValue) {
                const migratedCompany = normalizeCompany(JSON.parse(legacyValue), fallback)
                saveCompany(migratedCompany)
                return migratedCompany
            }
        } catch {
            return fallback
        }

        return fallback
    }

    function saveCompany(company) {
        const normalizedCompany = normalizeCompany(company)
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizedCompany))
        return normalizedCompany
    }

    function normalizeCompany(company, fallback = {}) {
        const source = company && typeof company === 'object' && !Array.isArray(company) ? company : {}
        const fallbackSource =
            fallback && typeof fallback === 'object' && !Array.isArray(fallback) ? fallback : {}

        return {
            companyName:
                limitText(cleanText(source.companyName), LIMITS.companyName) ||
                limitText(cleanText(fallbackSource.companyName), LIMITS.companyName),
            email:
                normalizeValidEmail(source.email) ||
                normalizeValidEmail(fallbackSource.email),
            phone:
                formatCompleteBrazilianPhone(onlyDigits(source.phone)) ||
                formatCompleteBrazilianPhone(onlyDigits(fallbackSource.phone)),
            address:
                limitText(cleanText(source.address), LIMITS.address) ||
                limitText(cleanText(fallbackSource.address), LIMITS.address),
            cnpj:
                formatCompleteCnpj(onlyDigits(source.cnpj)) ||
                formatCompleteCnpj(onlyDigits(fallbackSource.cnpj)),
            logoUrl:
                normalizeLogoSource(source.logoUrl).value ||
                normalizeLogoSource(fallbackSource.logoUrl).value
        }
    }

    function validateCompany(company) {
        const source = company && typeof company === 'object' && !Array.isArray(company) ? company : {}
        const errors = {}
        const companyName = cleanText(source.companyName)
        const email = normalizeEmail(source.email)
        const phoneDigits = onlyDigits(source.phone)
        const address = cleanText(source.address)
        const cnpjDigits = onlyDigits(source.cnpj)
        const logoResult = normalizeLogoSource(source.logoUrl)

        if (!companyName) {
            errors.companyName = 'Informe o nome da empresa.'
        } else if (companyName.length > LIMITS.companyName) {
            errors.companyName = `O nome da empresa deve ter no m\u00e1ximo ${LIMITS.companyName} caracteres.`
        }

        if (!email || !isValidEmail(email) || email.length > LIMITS.email) {
            errors.email = 'Informe um e-mail v\u00e1lido da empresa.'
        }

        if (phoneDigits.length < 10 || phoneDigits.length > LIMITS.phoneDigits) {
            errors.phone = 'Informe um telefone brasileiro com 10 ou 11 d\u00edgitos.'
        }

        if (!address) {
            errors.address = 'Informe o endere\u00e7o da empresa.'
        } else if (address.length > LIMITS.address) {
            errors.address = `O endere\u00e7o deve ter no m\u00e1ximo ${LIMITS.address} caracteres.`
        }

        if (cnpjDigits.length !== LIMITS.cnpjDigits) {
            errors.cnpj = 'Informe um CNPJ com 14 d\u00edgitos.'
        }

        if (!logoResult.valid) {
            errors.logoUrl = logoResult.message
        }

        return {
            valid: Object.keys(errors).length === 0,
            errors,
            company: {
                companyName: limitText(companyName, LIMITS.companyName),
                email: limitText(email, LIMITS.email),
                phone: formatCompleteBrazilianPhone(phoneDigits),
                address: limitText(address, LIMITS.address),
                cnpj: formatCompleteCnpj(cnpjDigits),
                logoUrl: logoResult.value
            }
        }
    }

    function validateLogoFile(file) {
        if (!file) {
            return { valid: true, message: '' }
        }

        const extension = getFileExtension(file.name)

        if (!allowedLogoMimeTypes.has(file.type) || !allowedLogoExtensions.includes(extension)) {
            return {
                valid: false,
                message: 'Envie uma logo nos formatos PNG, JPG ou JPEG.'
            }
        }

        if (file.size > LIMITS.logoBytes) {
            return {
                valid: false,
                message: 'A logo deve ter no m\u00e1ximo 1 MB.'
            }
        }

        return { valid: true, message: '' }
    }

    function normalizeLogoSource(value) {
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

            if (byteLength > LIMITS.logoBytes) {
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
            const pathParts = source.split('/')
            const extension = getFileExtension(pathParts[pathParts.length - 1])

            if (!source.includes('..') && allowedLogoExtensions.includes(extension)) {
                return { valid: true, value: source, message: '' }
            }
        }

        return {
            valid: false,
            value: '',
            message: 'A logo deve ser um arquivo PNG, JPG ou JPEG v\u00e1lido.'
        }
    }

    function formatBrazilianPhone(digits) {
        const normalizedDigits = String(digits || '').replace(/\D/g, '').slice(0, LIMITS.phoneDigits)

        if (normalizedDigits.length <= 2) {
            return normalizedDigits ? `(${normalizedDigits}` : ''
        }

        if (normalizedDigits.length <= 6) {
            return `(${normalizedDigits.slice(0, 2)}) ${normalizedDigits.slice(2)}`
        }

        if (normalizedDigits.length <= 10) {
            return `(${normalizedDigits.slice(0, 2)}) ${normalizedDigits.slice(2, 6)}-${normalizedDigits.slice(6)}`
        }

        return `(${normalizedDigits.slice(0, 2)}) ${normalizedDigits.slice(2, 7)}-${normalizedDigits.slice(7)}`
    }

    function formatCnpj(digits) {
        const normalizedDigits = String(digits || '').replace(/\D/g, '').slice(0, LIMITS.cnpjDigits)

        if (normalizedDigits.length <= 2) {
            return normalizedDigits
        }

        if (normalizedDigits.length <= 5) {
            return `${normalizedDigits.slice(0, 2)}.${normalizedDigits.slice(2)}`
        }

        if (normalizedDigits.length <= 8) {
            return `${normalizedDigits.slice(0, 2)}.${normalizedDigits.slice(2, 5)}.${normalizedDigits.slice(5)}`
        }

        if (normalizedDigits.length <= 12) {
            return `${normalizedDigits.slice(0, 2)}.${normalizedDigits.slice(2, 5)}.${normalizedDigits.slice(5, 8)}/${normalizedDigits.slice(8)}`
        }

        return `${normalizedDigits.slice(0, 2)}.${normalizedDigits.slice(2, 5)}.${normalizedDigits.slice(5, 8)}/${normalizedDigits.slice(8, 12)}-${normalizedDigits.slice(12)}`
    }

    function formatCompleteBrazilianPhone(digits) {
        const normalizedDigits = String(digits || '').replace(/\D/g, '')

        if (normalizedDigits.length === 10 || normalizedDigits.length === 11) {
            return formatBrazilianPhone(normalizedDigits)
        }

        return ''
    }

    function formatCompleteCnpj(digits) {
        const normalizedDigits = String(digits || '').replace(/\D/g, '')

        return normalizedDigits.length === LIMITS.cnpjDigits ? formatCnpj(normalizedDigits) : ''
    }

    function cleanText(value) {
        if (typeof value !== 'string') {
            return ''
        }

        return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim()
    }

    function normalizeEmail(value) {
        return limitText(cleanText(value).toLowerCase(), LIMITS.email)
    }

    function normalizeValidEmail(value) {
        const email = normalizeEmail(value)
        return email && isValidEmail(email) ? email : ''
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
    }

    function onlyDigits(value) {
        return typeof value === 'string' ? value.replace(/\D/g, '') : ''
    }

    function limitText(value, maxLength) {
        return String(value || '').slice(0, maxLength)
    }

    function getFileExtension(fileName) {
        const normalizedName = String(fileName || '').toLowerCase()
        const extensionStart = normalizedName.lastIndexOf('.')
        return extensionStart >= 0 ? normalizedName.slice(extensionStart) : ''
    }

    function hasExpectedImageSignature(mimeType, base64Payload) {
        if (mimeType === 'image/png') {
            return base64Payload.startsWith('iVBORw0KGgo')
        }

        if (mimeType === 'image/jpeg') {
            return base64Payload.startsWith('/9j/')
        }

        return false
    }

    window.GardesaCompanyStore = {
        storageKey: STORAGE_KEY,
        legacyProfileKey: LEGACY_PROFILE_KEY,
        limits: LIMITS,
        loadCompany,
        saveCompany,
        normalizeCompany,
        validateCompany,
        validateLogoFile,
        normalizeLogoSource,
        formatBrazilianPhone,
        formatCnpj,
        onlyDigits
    }
})()
