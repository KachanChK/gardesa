document.addEventListener('DOMContentLoaded', () => {
    const seed = window.__EMPRESA_SEED__
    const companyStore = window.GardesaCompanyStore

    if (!seed || !companyStore) {
        return
    }

    const elements = {
        form: document.querySelector('[data-company-form]'),
        formMessage: document.querySelector('[data-company-form-message]'),
        companyName: document.querySelector('[data-company-name]'),
        email: document.querySelector('[data-company-email]'),
        phone: document.querySelector('[data-company-phone]'),
        address: document.querySelector('[data-company-address]'),
        cnpj: document.querySelector('[data-company-cnpj]'),
        logoInput: document.querySelector('[data-company-logo-input]'),
        logoTrigger: document.querySelector('[data-company-logo-trigger]'),
        logoFileName: document.querySelector('[data-company-logo-file-name]'),
        logoPreviews: document.querySelectorAll('[data-company-logo-preview]'),
        logoPlaceholders: document.querySelectorAll('[data-company-logo-placeholder]'),
        logoRemoveButton: document.querySelector('[data-remove-company-logo]'),
        saveButton: document.querySelector('[data-save-company]'),
        nameCounter: document.querySelector('[data-company-name-counter]'),
        addressCounter: document.querySelector('[data-company-address-counter]')
    }

    if (!elements.form) {
        return
    }

    const state = {
        company: companyStore.loadCompany(seed.company),
        logoUrl: '',
        logoFileName: ''
    }

    state.logoUrl = state.company.logoUrl
    state.logoFileName = state.logoUrl ? 'Logo atual cadastrada' : ''

    populateForm()
    bindEvents()
    renderCompanyPreview()

    function bindEvents() {
        elements.form.addEventListener('submit', handleSubmit)

        elements.companyName?.addEventListener('input', (event) => {
            event.currentTarget.value = limitText(event.currentTarget.value, companyStore.limits.companyName)
            clearFieldError('companyName')
            updateCounters()
        })

        elements.email?.addEventListener('input', () => {
            clearFieldError('email')
        })

        elements.phone?.addEventListener('input', (event) => {
            event.currentTarget.value = companyStore.formatBrazilianPhone(event.currentTarget.value)
            clearFieldError('phone')
        })

        elements.address?.addEventListener('input', (event) => {
            event.currentTarget.value = limitText(event.currentTarget.value, companyStore.limits.address)
            clearFieldError('address')
            updateCounters()
        })

        elements.cnpj?.addEventListener('input', (event) => {
            event.currentTarget.value = companyStore.formatCnpj(event.currentTarget.value)
            clearFieldError('cnpj')
        })

        elements.logoInput?.addEventListener('change', handleLogoInput)
        elements.logoRemoveButton?.addEventListener('click', () => {
            state.logoUrl = ''
            if (elements.logoInput) {
                elements.logoInput.value = ''
            }
            state.logoFileName = ''
            clearFieldError('logoUrl')
            renderLogoPreview()
        })

        elements.logoTrigger?.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return
            }

            event.preventDefault()
            elements.logoInput?.click()
        })
    }

    function populateForm() {
        if (elements.companyName) {
            elements.companyName.value = state.company.companyName
        }
        if (elements.email) {
            elements.email.value = state.company.email
        }
        if (elements.phone) {
            elements.phone.value = state.company.phone
        }
        if (elements.address) {
            elements.address.value = state.company.address
        }
        if (elements.cnpj) {
            elements.cnpj.value = state.company.cnpj
        }

        updateCounters()
        renderLogoPreview()
    }

    async function handleSubmit(event) {
        event.preventDefault()
        hideFormMessage()
        clearFieldErrors()

        const payload = collectCompanyPayload()
        const frontendValidation = companyStore.validateCompany(payload)

        if (!frontendValidation.valid) {
            showFieldErrors(frontendValidation.errors)
            showFormMessage('error', 'Revise os campos destacados antes de salvar.')
            return
        }

        setSaving(true)

        try {
            const response = await fetch('/empresa/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: frontendValidation.company
                })
            })

            const result = await response.json()

            if (!response.ok) {
                showFieldErrors(result.errors || {})
                showFormMessage('error', 'Revise os campos destacados antes de salvar.')
                return
            }

            state.company = companyStore.saveCompany(result.profile)
            state.logoUrl = state.company.logoUrl
            state.logoFileName = state.logoUrl ? state.logoFileName || 'Logo atual cadastrada' : ''
            populateForm()
            renderCompanyPreview()
            showFormMessage('success', 'Dados da empresa salvos com sucesso.')
        } catch (error) {
            console.error(error)
            showFormMessage('error', 'N\u00e3o foi poss\u00edvel salvar agora. Tente novamente em instantes.')
        } finally {
            setSaving(false)
        }
    }

    function collectCompanyPayload() {
        return {
            companyName: elements.companyName?.value || '',
            email: elements.email?.value || '',
            phone: elements.phone?.value || '',
            address: elements.address?.value || '',
            cnpj: elements.cnpj?.value || '',
            logoUrl: state.logoUrl
        }
    }

    function handleLogoInput(event) {
        const file = event.currentTarget.files?.[0] || null
        clearFieldError('logoUrl')
        hideFormMessage()

        if (!file) {
            return
        }

        const validation = companyStore.validateLogoFile(file)
        if (!validation.valid) {
            state.logoUrl = state.company.logoUrl || ''
            state.logoFileName = state.logoUrl ? 'Logo atual cadastrada' : ''
            event.currentTarget.value = ''
            renderLogoPreview()
            showFieldErrors({ logoUrl: validation.message })
            return
        }

        const reader = new FileReader()
        reader.addEventListener('load', () => {
            const result = companyStore.normalizeLogoSource(String(reader.result || ''))

            if (!result.valid) {
                event.currentTarget.value = ''
                showFieldErrors({ logoUrl: result.message })
                return
            }

            state.logoUrl = result.value
            state.logoFileName = file.name
            renderLogoPreview()
        })
        reader.addEventListener('error', () => {
            event.currentTarget.value = ''
            showFieldErrors({ logoUrl: 'N\u00e3o foi poss\u00edvel ler o arquivo enviado.' })
        })
        reader.readAsDataURL(file)
    }

    function renderCompanyPreview() {
        renderLogoPreview()
    }

    function renderLogoPreview() {
        const hasLogo = Boolean(state.logoUrl)

        elements.logoPreviews.forEach((logoPreview) => {
            logoPreview.classList.toggle('hidden', !hasLogo)
            if (hasLogo) {
                logoPreview.src = state.logoUrl
            } else {
                logoPreview.removeAttribute('src')
            }
        })

        elements.logoPlaceholders.forEach((logoPlaceholder) => {
            logoPlaceholder.classList.toggle('hidden', hasLogo)
        })
        if (elements.logoFileName) {
            elements.logoFileName.textContent = state.logoFileName || 'Nenhum arquivo escolhido'
        }
    }

    function updateCounters() {
        if (elements.nameCounter && elements.companyName) {
            elements.nameCounter.textContent = `${elements.companyName.value.length}/${companyStore.limits.companyName}`
        }

        if (elements.addressCounter && elements.address) {
            elements.addressCounter.textContent = `${elements.address.value.length}/${companyStore.limits.address}`
        }
    }

    function showFieldErrors(errors) {
        Object.entries(errors).forEach(([fieldName, message]) => {
            const errorElement = document.querySelector(`[data-company-error="${fieldName}"]`)
            const fieldElement = document.querySelector(`[data-company-field="${fieldName}"]`)

            if (errorElement) {
                errorElement.textContent = message
                errorElement.classList.remove('hidden')
            }

            if (fieldElement) {
                fieldElement.setAttribute('aria-invalid', 'true')
                fieldElement.classList.add('border-[#f0b4b4]', 'bg-[#fff5f5]')
                fieldElement.classList.remove('border-[#d6d6d6]', 'border-[#e2e2e2]', 'bg-white', 'bg-[#fbfbfb]')
            }
        })

        const firstInvalidField = elements.form.querySelector('[aria-invalid="true"]')
        firstInvalidField?.focus()
    }

    function clearFieldError(fieldName) {
        const errorElement = document.querySelector(`[data-company-error="${fieldName}"]`)
        const fieldElement = document.querySelector(`[data-company-field="${fieldName}"]`)

        errorElement?.classList.add('hidden')

        if (fieldElement) {
            fieldElement.removeAttribute('aria-invalid')
            fieldElement.classList.remove('border-[#f0b4b4]', 'bg-[#fff5f5]')

            if (fieldName === 'logoUrl') {
                fieldElement.classList.add('border-[#e2e2e2]', 'bg-[#fbfbfb]')
                return
            }

            fieldElement.classList.add('border-[#d6d6d6]', 'bg-white')
        }
    }

    function clearFieldErrors() {
        ;['companyName', 'email', 'phone', 'address', 'cnpj', 'logoUrl'].forEach(clearFieldError)
    }

    function showFormMessage(type, message) {
        if (!elements.formMessage) {
            return
        }

        elements.formMessage.textContent = message
        elements.formMessage.classList.remove('hidden', 'border-[#f0b4b4]', 'bg-[#fff5f5]', 'text-[#c62828]', 'border-[#d9e6d4]', 'bg-[#f2f8ef]', 'text-verde-2')

        if (type === 'success') {
            elements.formMessage.classList.add('border-[#d9e6d4]', 'bg-[#f2f8ef]', 'text-verde-2')
        } else {
            elements.formMessage.classList.add('border-[#f0b4b4]', 'bg-[#fff5f5]', 'text-[#c62828]')
        }
    }

    function hideFormMessage() {
        elements.formMessage?.classList.add('hidden')
    }

    function setSaving(isSaving) {
        if (!elements.saveButton) {
            return
        }

        elements.saveButton.disabled = isSaving
        elements.saveButton.textContent = isSaving ? 'Salvando...' : 'Salvar altera\u00e7\u00f5es'
    }

    function limitText(value, maxLength) {
        return String(value || '').slice(0, maxLength)
    }
})
