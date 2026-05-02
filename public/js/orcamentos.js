document.addEventListener('DOMContentLoaded', () => {
    const seed = window.__ORCAMENTOS_SEED__

    if (!seed) {
        return
    }

    const clientStore = window.GardesaClientStore || null
    const companyStore = window.GardesaCompanyStore || null

    const STORAGE_KEYS = {
        profile: 'gardesa:orcamentos:profile:v1',
        clients: 'gardesa:orcamentos:clients:v1',
        budgets: 'gardesa:orcamentos:budgets:v1'
    }

    const statusClassMap = {
        Rascunho: 'bg-[#f0f0f0] text-preto',
        Enviado: 'bg-[#fff1df] text-laranja',
        Aprovado: 'bg-[#d1fac8] text-verde-2',
        Recusado: 'bg-[#f7d7d7] text-[#b42318]'
    }

    const saveIndicatorClassMap = {
        saving: 'bg-[#fff1df] text-laranja',
        saved: 'bg-[#f2f8ef] text-verde-2'
    }

    const MAX_BUDGET_ITEMS = 20
    const budgetStatusOptions = ['Rascunho', 'Enviado', 'Aprovado', 'Recusado']
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

    const elements = {
        listView: document.querySelector('[data-budget-list-view]'),
        editorView: document.querySelector('[data-budget-editor-view]'),
        budgetTable: document.querySelector('[data-budget-table]'),
        budgetMobileList: document.querySelector('[data-budget-mobile-list]'),
        budgetEmpty: document.querySelector('[data-budget-empty]'),
        budgetSearch: document.querySelector('[data-budget-search]'),
        budgetStatusFilter: document.querySelector('[data-budget-status-filter]'),
        openNewBudgetButtons: document.querySelectorAll('[data-open-new-budget]'),
        openPreviewFromListButton: document.querySelector('[data-open-preview-from-list]'),
        metricTotal: document.querySelector('[data-metric-total]'),
        metricTotalHint: document.querySelector('[data-metric-total-hint]'),
        metricDrafts: document.querySelector('[data-metric-drafts]'),
        metricDraftsHint: document.querySelector('[data-metric-drafts-hint]'),
        metricSent: document.querySelector('[data-metric-sent]'),
        metricSentHint: document.querySelector('[data-metric-sent-hint]'),
        metricValue: document.querySelector('[data-metric-value]'),
        backToListButton: document.querySelector('[data-back-to-list]'),
        editorTitle: document.querySelector('[data-editor-title]'),
        saveIndicator: document.querySelector('[data-save-indicator]'),
        expiredBanner: document.querySelector('[data-expired-banner]'),
        budgetName: document.querySelector('[data-budget-name]'),
        budgetNumber: document.querySelector('[data-budget-number]'),
        budgetDescription: document.querySelector('[data-budget-description]'),
        editorClientSearch: document.querySelector('[data-editor-client-search]'),
        editorClientResults: document.querySelector('[data-editor-client-results]'),
        editorClientHelp: document.querySelector('[data-editor-client-help]'),
        addItemButton: document.querySelector('[data-add-item]'),
        itemsEmpty: document.querySelector('[data-items-empty]'),
        itemList: document.querySelector('[data-item-list]'),
        computedTotal: document.querySelector('[data-computed-total]'),
        effectiveTotal: document.querySelector('[data-effective-total]'),
        totalOverrideBadge: document.querySelector('[data-total-override-badge]'),
        resetTotalButton: document.querySelector('[data-reset-total]'),
        toggleValuesButton: document.querySelector('[data-toggle-values]'),
        toggleValuesThumb: document.querySelector('[data-toggle-values-thumb]'),
        budgetValidity: document.querySelector('[data-budget-validity]'),
        paymentOptions: document.querySelector('[data-payment-options]'),
        otherPaymentWrapper: document.querySelector('[data-other-payment-wrapper]'),
        otherPayment: document.querySelector('[data-other-payment]'),
        paymentConditions: document.querySelector('[data-payment-conditions]'),
        budgetObservations: document.querySelector('[data-budget-observations]'),
        summaryStatusBadge: document.querySelector('[data-summary-status-badge]'),
        summaryClient: document.querySelector('[data-summary-client]'),
        summaryItems: document.querySelector('[data-summary-items]'),
        summaryTotal: document.querySelector('[data-summary-total]'),
        summaryValidity: document.querySelector('[data-summary-validity]'),
        exportChecklist: document.querySelector('[data-export-checklist]'),
        profileCompanyName: document.querySelector('[data-profile-company-name]'),
        profileEmail: document.querySelector('[data-profile-email]'),
        profilePhone: document.querySelector('[data-profile-phone]'),
        profileDocument: document.querySelector('[data-profile-document]'),
        profileAddress: document.querySelector('[data-profile-address]'),
        previewButtons: document.querySelectorAll('[data-open-preview]'),
        exportButton: document.querySelector('[data-export-pdf]'),
        previewDrawer: document.querySelector('[data-preview-drawer]'),
        previewPanel: document.querySelector('[data-preview-panel]'),
        previewCloseButtons: document.querySelectorAll('[data-close-preview]'),
        previewFrame: document.querySelector('[data-preview-frame]'),
        previewStatus: document.querySelector('[data-preview-status]'),
        newBudgetModal: document.querySelector('[data-new-budget-modal]'),
        newBudgetCloseButtons: document.querySelectorAll('[data-close-new-budget]'),
        newBudgetName: document.querySelector('[data-new-budget-name]'),
        newBudgetClientSearch: document.querySelector('[data-new-budget-client-search]'),
        newBudgetClientResults: document.querySelector('[data-new-budget-client-results]'),
        newBudgetClientHelp: document.querySelector('[data-new-budget-client-help]'),
        nextBudgetNumber: document.querySelector('[data-next-budget-number]'),
        createBudgetButton: document.querySelector('[data-create-budget]'),
        newClientModal: document.querySelector('[data-new-client-modal]'),
        newClientFormError: document.querySelector('[data-new-client-form-error]'),
        newClientCloseButtons: document.querySelectorAll('[data-close-new-client]'),
        newClientName: document.querySelector('[data-new-client-name]'),
        newClientEmail: document.querySelector('[data-new-client-email]'),
        newClientPhone: document.querySelector('[data-new-client-phone]'),
        newClientAddress: document.querySelector('[data-new-client-address]'),
        newClientDocument: document.querySelector('[data-new-client-document]'),
        saveNewClientButton: document.querySelector('[data-save-new-client]'),
        exportWarningModal: document.querySelector('[data-export-warning-modal]'),
        exportWarningCloseButtons: document.querySelectorAll('[data-close-export-warning]'),
        exportWarningList: document.querySelector('[data-export-warning-list]'),
        confirmExportButton: document.querySelector('[data-confirm-export]'),
        deleteBudgetModal: document.querySelector('[data-delete-budget-modal]'),
        deleteBudgetCloseButtons: document.querySelectorAll('[data-close-delete-budget]'),
        deleteBudgetName: document.querySelector('[data-delete-budget-name]'),
        confirmDeleteBudgetButton: document.querySelector('[data-confirm-delete-budget]')
    }

    if (!elements.listView || !elements.editorView || !elements.itemList || !elements.paymentOptions) {
        return
    }

    const state = {
        profile: companyStore
            ? companyStore.loadCompany(seed.profile)
            : loadCollection(STORAGE_KEYS.profile, seed.profile),
        budgetDefaults: {
            defaultPaymentMethods: Array.isArray(seed.profile.defaultPaymentMethods)
                ? [...seed.profile.defaultPaymentMethods]
                : [],
            defaultPaymentConditions: limitTextValue(
                seed.profile.defaultPaymentConditions || '',
                MAX_PAYMENT_CONDITIONS_LENGTH
            )
        },
        clients: clientStore
            ? clientStore.loadClients(seed.clients)
            : loadCollection(STORAGE_KEYS.clients, seed.clients),
        budgets: normalizeBudgetCollection(loadCollection(STORAGE_KEYS.budgets, seed.budgets)),
        selectedBudgetId: null,
        filters: {
            search: '',
            status: 'all'
        },
        saveState: 'saved',
        lastSavedAt: null,
        saveTimer: null,
        previewTimer: null,
        previewOpen: false,
        previewRequestToken: 0,
        draggingItemId: null,
        activeClientDropdown: null,
        openActionMenuBudgetId: null,
        pendingDeleteBudgetId: null,
        exportRequest: {
            budgetId: null,
            triggerButton: null
        },
        clientModalContext: 'new-budget',
        newBudgetDraft: {
            name: '',
            clientId: null,
            search: ''
        },
        editorClientSearch: ''
    }

    renderPaymentOptions()
    bindEvents()
    syncFromUrl()
    renderDashboard()
    renderProfileCard()
    updateSaveIndicator()

    function bindEvents() {
        elements.openNewBudgetButtons.forEach((button) => {
            button.addEventListener('click', openNewBudgetModal)
        })

        elements.openPreviewFromListButton?.addEventListener('click', () => {
            const selectedBudget = getSelectedBudget() || state.budgets[0]

            if (!selectedBudget) {
                window.alert('Crie um orçamento antes de abrir o preview.')
                return
            }

            state.selectedBudgetId = selectedBudget.id
            openPreviewDrawer()
        })

        elements.budgetSearch?.addEventListener('input', (event) => {
            state.filters.search = event.currentTarget.value
            renderDashboard()
        })

        elements.budgetStatusFilter?.addEventListener('change', (event) => {
            state.filters.status = event.currentTarget.value
            renderDashboard()
        })

        elements.budgetTable?.addEventListener('click', handleBudgetTableAction)
        elements.budgetMobileList?.addEventListener('click', handleBudgetTableAction)
        elements.budgetTable?.addEventListener('change', handleBudgetListChange)
        elements.budgetMobileList?.addEventListener('change', handleBudgetListChange)

        elements.backToListButton?.addEventListener('click', () => {
            showListView()
        })

        elements.budgetName?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = limitTextValue(event.currentTarget.value, MAX_BUDGET_NAME_LENGTH)
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.name = nextValue
            budget.updatedAt = new Date().toISOString()
            refreshEditorSummary()
            queueSave()
        })

        elements.budgetDescription?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = limitTextValue(
                event.currentTarget.value,
                MAX_PROJECT_DESCRIPTION_LENGTH
            )
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.description = nextValue
            budget.updatedAt = new Date().toISOString()
            queueSave()
        })

        elements.editorClientSearch?.addEventListener('focus', () => {
            scheduleClientDropdownOpen('editor')
        })

        elements.editorClientSearch?.addEventListener('click', () => {
            scheduleClientDropdownOpen('editor')
        })

        elements.editorClientSearch?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()

            if (!budget) {
                return
            }

            const value = event.currentTarget.value
            const selectedClient = getClientById(budget.clientId)
            let selectionChanged = false
            setClientSearchTerm('editor', value)
            state.activeClientDropdown = 'editor'

            if (
                budget.clientId &&
                (!selectedClient || normalizeClientSearch(value) !== normalizeClientSearch(selectedClient.name))
            ) {
                budget.clientId = 0
                budget.updatedAt = new Date().toISOString()
                refreshEditorSummary()
                selectionChanged = true
            }

            if (selectionChanged) {
                queueSave()
            }
            renderClientResults('editor')
        })

        elements.editorClientResults?.addEventListener('click', handleClientDropdownAction)

        elements.addItemButton?.addEventListener('click', () => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            if (budget.items.length >= MAX_BUDGET_ITEMS) {
                window.alert(`O orçamento pode ter no máximo ${MAX_BUDGET_ITEMS} itens.`)
                return
            }

            budget.items.push(createBlankItem())
            budget.updatedAt = new Date().toISOString()
            renderItems()
            refreshEditorSummary()
            queueSave()
        })

        elements.itemList?.addEventListener('input', handleItemInput)
        elements.itemList?.addEventListener('change', handleItemInput)
        elements.itemList?.addEventListener('click', handleItemClick)
        elements.itemList?.addEventListener('dragstart', handleItemDragStart)
        elements.itemList?.addEventListener('dragover', handleItemDragOver)
        elements.itemList?.addEventListener('dragleave', handleItemDragLeave)
        elements.itemList?.addEventListener('drop', handleItemDrop)
        elements.itemList?.addEventListener('dragend', clearDragStyles)

        elements.effectiveTotal?.addEventListener('focus', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const currentValue = hasTotalOverride(budget)
                ? parseAmount(budget.totalOverride)
                : getComputedTotal(budget)

            event.currentTarget.dataset.previousOverride = budget.totalOverride || ''
            event.currentTarget.dataset.initialAmount = String(currentValue)
            event.currentTarget.value = formatEditableAmount(currentValue)
            window.requestAnimationFrame(() => {
                event.currentTarget.select()
            })
        })

        elements.effectiveTotal?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = normalizeEditableTotalInputValue(event.currentTarget.value)
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.totalOverride = nextValue
            budget.updatedAt = new Date().toISOString()
            refreshTotals()
            refreshEditorSummary()
            queueSave()
        })

        elements.effectiveTotal?.addEventListener('blur', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const previousOverride = event.currentTarget.dataset.previousOverride || ''
            const initialAmount = Number.parseFloat(event.currentTarget.dataset.initialAmount || '0')
            const nextAmount = parseAmount(event.currentTarget.value)
            const previousOverrideActive =
                previousOverride !== '' && parseAmount(previousOverride) > 0
            const unchangedAmount = Math.abs(nextAmount - initialAmount) < 0.005
            let nextOverride = ''

            if (event.currentTarget.value.trim() && nextAmount > 0) {
                if (previousOverrideActive && unchangedAmount) {
                    nextOverride = previousOverride
                } else if (!previousOverrideActive && Math.abs(nextAmount - getComputedTotal(budget)) < 0.005) {
                    nextOverride = ''
                } else {
                    nextOverride = normalizeAmountForStorage(event.currentTarget.value)
                }
            }

            budget.totalOverride = nextOverride

            if (nextOverride !== previousOverride) {
                budget.updatedAt = new Date().toISOString()
                queueSave()
            }

            refreshTotals()
            refreshEditorSummary()
        })

        elements.effectiveTotal?.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') {
                return
            }

            event.preventDefault()
            event.currentTarget.blur()
        })

        elements.resetTotalButton?.addEventListener('click', () => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            budget.totalOverride = ''
            budget.updatedAt = new Date().toISOString()
            refreshTotals()
            refreshEditorSummary()
            queueSave()
        })

        elements.toggleValuesButton?.addEventListener('click', () => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            budget.showValuesInPdf = !budget.showValuesInPdf
            budget.updatedAt = new Date().toISOString()
            refreshToggle()
            queueSave()
        })

        elements.budgetValidity?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            budget.validityDate = event.currentTarget.value
            budget.updatedAt = new Date().toISOString()
            refreshEditorSummary()
            renderDashboard()
            queueSave()
        })

        elements.paymentOptions?.addEventListener('change', (event) => {
            const checkbox = event.target.closest('[data-payment-option]')
            const budget = getSelectedBudget()

            if (!checkbox || !budget) {
                return
            }

            const paymentValue = checkbox.value
            const selectedMethods = new Set(budget.paymentMethods)

            if (checkbox.checked) {
                selectedMethods.add(paymentValue)
            } else {
                selectedMethods.delete(paymentValue)
            }

            budget.paymentMethods = Array.from(selectedMethods)
            if (!budget.paymentMethods.includes('other')) {
                budget.otherPaymentMethod = ''
                if (elements.otherPayment) {
                    elements.otherPayment.value = ''
                }
            }
            budget.updatedAt = new Date().toISOString()
            refreshOtherPaymentVisibility()
            refreshEditorSummary()
            queueSave()
        })

        elements.otherPayment?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = limitTextValue(event.currentTarget.value, MAX_OTHER_PAYMENT_LENGTH)
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.otherPaymentMethod = nextValue
            budget.updatedAt = new Date().toISOString()
            queueSave()
        })

        elements.paymentConditions?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = limitTextValue(
                event.currentTarget.value,
                MAX_PAYMENT_CONDITIONS_LENGTH
            )
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.paymentConditions = nextValue
            budget.updatedAt = new Date().toISOString()
            queueSave()
        })

        elements.budgetObservations?.addEventListener('input', (event) => {
            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            const nextValue = limitTextValue(event.currentTarget.value, MAX_OBSERVATIONS_LENGTH)
            if (event.currentTarget.value !== nextValue) {
                event.currentTarget.value = nextValue
            }
            budget.observations = nextValue
            budget.updatedAt = new Date().toISOString()
            queueSave()
        })

        elements.previewButtons.forEach((button) => {
            button.addEventListener('click', openPreviewDrawer)
        })

        elements.exportButton?.addEventListener('click', () => {
            attemptExport({
                budgetId: state.selectedBudgetId,
                force: false,
                triggerButton: elements.exportButton
            })
        })

        elements.previewCloseButtons.forEach((button) => {
            button.addEventListener('click', closePreviewDrawer)
        })

        elements.newBudgetCloseButtons.forEach((button) => {
            button.addEventListener('click', closeNewBudgetModal)
        })

        elements.newBudgetClientSearch?.addEventListener('focus', () => {
            scheduleClientDropdownOpen('new-budget')
        })

        elements.newBudgetClientSearch?.addEventListener('click', () => {
            scheduleClientDropdownOpen('new-budget')
        })

        elements.newBudgetClientSearch?.addEventListener('input', (event) => {
            const value = event.currentTarget.value
            const selectedClient = getClientById(state.newBudgetDraft.clientId)

            setClientSearchTerm('new-budget', value)
            state.activeClientDropdown = 'new-budget'

            if (
                state.newBudgetDraft.clientId &&
                (!selectedClient || normalizeClientSearch(value) !== normalizeClientSearch(selectedClient.name))
            ) {
                state.newBudgetDraft.clientId = null
            }

            renderClientResults('new-budget')
        })

        elements.newBudgetClientResults?.addEventListener('click', handleClientDropdownAction)

        elements.createBudgetButton?.addEventListener('click', createBudgetFromDraft)

        elements.newClientCloseButtons.forEach((button) => {
            button.addEventListener('click', closeNewClientModal)
        })

        elements.saveNewClientButton?.addEventListener('click', saveNewClient)
        elements.newClientName?.addEventListener('input', () => {
            if ((elements.newClientName?.value || '').trim()) {
                hideNewClientFormError()
            }
        })

        elements.exportWarningCloseButtons.forEach((button) => {
            button.addEventListener('click', closeExportWarningModal)
        })

        elements.confirmExportButton?.addEventListener('click', () => {
            closeExportWarningModal()
            attemptExport({ force: true })
        })

        elements.deleteBudgetCloseButtons.forEach((button) => {
            button.addEventListener('click', closeDeleteBudgetModal)
        })

        elements.confirmDeleteBudgetButton?.addEventListener('click', confirmDeleteBudget)

        document.addEventListener('click', handleDocumentClick)
        window.addEventListener('pagehide', flushSave)
    }

    function syncFromUrl() {
        const params = new URLSearchParams(window.location.search)
        const budgetIdParam = Number.parseInt(params.get('orcamento') || '', 10)

        if (Number.isFinite(budgetIdParam)) {
            const existingBudget = state.budgets.find((budget) => budget.id === budgetIdParam)
            if (existingBudget) {
                openEditor(existingBudget.id)
                return
            }
        }

        showListView()
    }

    function renderDashboard() {
        renderMetrics()
        renderBudgetList()
    }

    function renderMetrics() {
        const totalBudgets = state.budgets.length
        const draftBudgets = state.budgets.filter((budget) => budget.status === 'Rascunho').length
        const sentBudgets = state.budgets.filter((budget) =>
            ['Enviado', 'Aprovado'].includes(budget.status)
        ).length
        const totalValue = state.budgets.reduce((sum, budget) => sum + getEffectiveTotal(budget), 0)

        if (elements.metricTotal) {
            elements.metricTotal.textContent = String(totalBudgets)
        }
        if (elements.metricTotalHint) {
            elements.metricTotalHint.textContent =
                totalBudgets === 1 ? '1 orçamento' : `${totalBudgets} orçamentos`
        }
        if (elements.metricDrafts) {
            elements.metricDrafts.textContent = String(draftBudgets)
        }
        if (elements.metricDraftsHint) {
            elements.metricDraftsHint.textContent =
                draftBudgets === 1 ? '1 rascunho' : `${draftBudgets} rascunhos`
        }
        if (elements.metricSent) {
            elements.metricSent.textContent = String(sentBudgets)
        }
        if (elements.metricSentHint) {
            elements.metricSentHint.textContent =
                sentBudgets === 1 ? '1 em andamento' : `${sentBudgets} em andamento`
        }
        if (elements.metricValue) {
            elements.metricValue.textContent = formatCurrency(totalValue)
        }
    }

    function getBudgetActionMenuMarkup(budgetId) {
        if (state.openActionMenuBudgetId !== budgetId) {
            return ''
        }

        return `
            <div class="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[188px] rounded-[16px] border border-[#e2e2e2] bg-white p-2 shadow-[0_18px_40px_rgba(20,20,20,0.12)]">
                <button type="button" data-action="preview" data-budget-id="${budgetId}"
                    class="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-preto transition-colors hover:bg-[#f3f3f3]">
                    <img src="/img/icons/olho_black.svg" alt="" class="size-4" />
                    Visualizar
                </button>
                <button type="button" data-action="export" data-budget-id="${budgetId}"
                    class="mt-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-preto transition-colors hover:bg-[#f3f3f3]">
                    <img src="/img/icons/download_icon.svg" alt="" class="size-4" />
                    Exportar
                </button>
                <button type="button" data-action="delete" data-budget-id="${budgetId}"
                    class="mt-1 flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium text-[#b42318] transition-colors hover:bg-[#fff5f5]">
                    <img src="/img/icons/deletar_icon.svg" alt="" class="size-4" />
                    Deletar
                </button>
            </div>
        `
    }

    function getBudgetStatusControlMarkup(budget) {
        const statusClasses = statusClassMap[budget.status] || statusClassMap.Rascunho

        return `
            <label class="relative inline-flex w-full min-w-0 items-center">
                <select data-budget-status-select="${budget.id}"
                    class="h-8 w-full cursor-pointer appearance-none rounded-full pl-3 pr-8 text-left text-xs font-medium outline-none ${statusClasses}">
                    ${budgetStatusOptions
                        .map(
                            (status) => `
                                <option value="${status}" ${status === budget.status ? 'selected' : ''}>
                                    ${status}
                                </option>
                            `
                        )
                        .join('')}
                </select>
                <img src="/img/icons/seta_baixo.svg" alt="" class="pointer-events-none absolute right-3 size-3 opacity-70" />
            </label>
        `
    }

    function renderBudgetList() {
        const filteredBudgets = getFilteredBudgets()

        if (elements.budgetEmpty) {
            elements.budgetEmpty.classList.toggle('hidden', filteredBudgets.length !== 0)
        }

        if (elements.budgetTable) {
            elements.budgetTable.innerHTML = filteredBudgets
                .map((budget) => {
                    const client = getClientById(budget.clientId)
                    const expired = isBudgetExpired(budget)

                    return `
                        <article class="grid min-h-[68px] grid-cols-[72px_minmax(220px,1.55fr)_minmax(180px,1fr)_minmax(170px,0.92fr)_112px_148px_128px] items-center gap-x-3 px-6 text-sm text-preto max-[1424px]:grid-cols-[72px_minmax(220px,1.55fr)_minmax(170px,1fr)_minmax(160px,0.9fr)_148px_128px] max-[1220px]:grid-cols-[72px_minmax(220px,1.6fr)_minmax(150px,0.95fr)_minmax(156px,0.85fr)_128px]">
                            <p class="min-w-0 truncate pr-3 font-medium text-preto">#${budget.id}</p>
                            <div class="min-w-0 pr-4">
                                <p class="truncate font-medium text-preto">${escapeHtml(budget.name)}</p>
                                ${
                                    expired
                                        ? '<p class="mt-1 truncate text-xs font-medium text-laranja">Validade vencida</p>'
                                        : ''
                                }
                            </div>
                            <p class="min-w-0 truncate pr-4 font-normal text-preto">${escapeHtml(client ? client.name : 'Cliente não informado')}</p>
                            <p class="min-w-0 whitespace-nowrap font-normal text-preto">${formatCurrency(getEffectiveTotal(budget))}</p>
                            <p class="whitespace-nowrap pr-3 font-normal text-preto max-[1424px]:hidden">${formatDate(budget.updatedAt)}</p>
                            <div class="max-[1220px]:hidden">
                                ${getBudgetStatusControlMarkup(budget)}
                            </div>
                            <div data-budget-action-root class="relative flex items-center justify-end gap-2">
                                <button type="button" data-action="edit" data-budget-id="${budget.id}"
                                    class="inline-flex h-9 items-center justify-center rounded-full bg-azul-escuro px-4 text-xs font-semibold text-white transition-colors hover:bg-azul-escuro/85 cursor-pointer">
                                    Editar
                                </button>
                                <button type="button" data-action="toggle-menu" data-budget-id="${budget.id}"
                                    class="inline-flex size-9 items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f3f3f3] cursor-pointer"
                                    aria-label="Abrir ações do orçamento"
                                    aria-expanded="${state.openActionMenuBudgetId === budget.id ? 'true' : 'false'}">
                                    <img src="/img/icons/more_black.svg" alt="" class="size-4" />
                                </button>
                                ${getBudgetActionMenuMarkup(budget.id)}
                            </div>
                        </article>
                    `
                })
                .join('')
        }

        if (elements.budgetMobileList) {
            elements.budgetMobileList.innerHTML = filteredBudgets
                .map((budget) => {
                    const client = getClientById(budget.clientId)
                    const expired = isBudgetExpired(budget)

                    return `
                        <article class="flex flex-col gap-4 px-5 py-5">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="truncate text-base font-semibold text-preto">${escapeHtml(budget.name)}</p>
                                    <p class="mt-2 text-sm font-light text-preto/60">${escapeHtml(
                                        client ? client.name : 'Cliente não informado'
                                    )}</p>
                                </div>
                                <div class="w-[124px] shrink-0">
                                    ${getBudgetStatusControlMarkup(budget)}
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <span class="text-xs font-medium text-preto">ID #${budget.id}</span>
                                ${
                                    expired
                                        ? '<span class="text-xs font-medium text-laranja">Validade vencida</span>'
                                        : ''
                                }
                            </div>
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p class="text-xs font-light uppercase tracking-[0.16em] text-preto/45">Valor</p>
                                    <p class="mt-2 font-medium text-preto">${formatCurrency(getEffectiveTotal(budget))}</p>
                                </div>
                                <div>
                                    <p class="text-xs font-light uppercase tracking-[0.16em] text-preto/45">Atualizado</p>
                                    <p class="mt-2 font-medium text-preto">${formatDate(budget.updatedAt)}</p>
                                </div>
                            </div>
                            <div data-budget-action-root class="relative flex items-center justify-between gap-3">
                                <button type="button" data-action="edit" data-budget-id="${budget.id}"
                                    class="inline-flex h-10 items-center justify-center rounded-full bg-preto px-5 text-sm font-semibold text-white transition-colors hover:bg-preto/85">
                                    Editar
                                </button>
                                <button type="button" data-action="toggle-menu" data-budget-id="${budget.id}"
                                    class="inline-flex size-10 items-center justify-center rounded-full border border-[#e2e2e2] bg-white transition-colors hover:bg-[#f3f3f3]"
                                    aria-label="Abrir ações do orçamento"
                                    aria-expanded="${state.openActionMenuBudgetId === budget.id ? 'true' : 'false'}">
                                    <img src="/img/icons/more_black.svg" alt="" class="size-4" />
                                </button>
                                ${getBudgetActionMenuMarkup(budget.id)}
                            </div>
                        </article>
                    `
                })
                .join('')
        }
    }

    function openEditor(budgetId) {
        const budget = state.budgets.find((entry) => entry.id === budgetId)

        if (!budget) {
            return
        }

        state.openActionMenuBudgetId = null
        state.selectedBudgetId = budget.id
        elements.listView?.classList.add('hidden')
        elements.editorView?.classList.remove('hidden')
        populateEditorForm(budget)
        renderItems()
        refreshEditorSummary()
        refreshTotals()
        refreshToggle()
        refreshOtherPaymentVisibility()
        updateQueryParam(budget.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    function showListView() {
        state.openActionMenuBudgetId = null
        elements.editorView?.classList.add('hidden')
        elements.listView?.classList.remove('hidden')
        updateQueryParam(null)
    }

    function populateEditorForm(budget) {
        if (elements.editorTitle) {
            elements.editorTitle.textContent = budget.name || 'Novo orçamento'
        }
        if (elements.budgetName) {
            elements.budgetName.value = budget.name
        }
        if (elements.budgetNumber) {
            elements.budgetNumber.textContent = `#${budget.number}`
        }
        if (elements.budgetDescription) {
            elements.budgetDescription.value = budget.description
        }
        if (elements.editorClientSearch) {
            const client = getClientById(budget.clientId)
            elements.editorClientSearch.value = client ? client.name : ''
        }
        setClientSearchTerm('editor', '')
        if (elements.budgetValidity) {
            elements.budgetValidity.value = budget.validityDate || ''
        }
        if (elements.otherPayment) {
            elements.otherPayment.value = budget.otherPaymentMethod || ''
        }
        if (elements.paymentConditions) {
            elements.paymentConditions.value = budget.paymentConditions
        }
        if (elements.budgetObservations) {
            elements.budgetObservations.value = budget.observations
        }

        renderPaymentOptions()
        renderClientResults('editor')
    }

    function renderItems() {
        const budget = getSelectedBudget()

        if (!budget || !elements.itemList) {
            return
        }

        const hasItems = budget.items.length > 0
        elements.itemsEmpty?.classList.toggle('hidden', hasItems)

        if (elements.addItemButton) {
            const limitReached = budget.items.length >= MAX_BUDGET_ITEMS
            elements.addItemButton.disabled = limitReached
            elements.addItemButton.classList.toggle('opacity-60', limitReached)
            elements.addItemButton.classList.toggle('cursor-not-allowed', limitReached)
            elements.addItemButton.title = limitReached
                ? `Limite de ${MAX_BUDGET_ITEMS} itens atingido`
                : 'Adicionar item'
        }

        elements.itemList.innerHTML = budget.items
            .map((item, index) => {
                const subtotal = calculateSubtotal(item)

                return `
                    <article class="rounded-[16px] border border-[#e2e2e2] bg-[#fbfbfb] p-4 shadow-sm transition-shadow hover:shadow-md" draggable="true" data-item-id="${item.id}">
                        <div class="flex flex-wrap items-center gap-3">
                            <div class="flex items-center gap-3">
                                <span class="inline-flex size-10 items-center justify-center rounded-full border border-[#d9e6d4] bg-white text-preto/55">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="9" cy="7" r="1"></circle>
                                        <circle cx="9" cy="12" r="1"></circle>
                                        <circle cx="9" cy="17" r="1"></circle>
                                        <circle cx="15" cy="7" r="1"></circle>
                                        <circle cx="15" cy="12" r="1"></circle>
                                        <circle cx="15" cy="17" r="1"></circle>
                                    </svg>
                                </span>
                                <div>
                                    <p class="text-xs font-medium uppercase tracking-[0.16em] text-preto">Item ${String(index + 1).padStart(2, '0')}</p>
                                </div>
                            </div>
                            <button type="button" data-remove-item="${item.id}"
                                class="inline-flex size-10 items-center justify-center rounded-full border border-[#f0b4b4] bg-white text-[#c62828] transition-colors hover:bg-[#fff5f5]"
                                aria-label="Remover item">
                                <svg xmlns="http://www.w3.org/2000/svg" class="size-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M5 5L15 15" stroke-linecap="round" />
                                    <path d="M15 5L5 15" stroke-linecap="round" />
                                </svg>
                            </button>
                        </div>

                        <div class="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.8fr)_120px_190px_140px_160px]">
                            <label class="flex min-w-0 flex-col gap-2">
                                <span class="text-sm font-medium text-preto">Descrição</span>
                                <input type="text" data-item-field="description" maxlength="80" value="${escapeAttribute(item.description)}"
                                    class="h-12 rounded-[8px] border border-[#e2e2e2] bg-white px-4 text-sm text-preto outline-none transition-colors focus:border-verde"
                                    placeholder="Nome do item, produto ou serviço" />
                            </label>

                            <div class="grid grid-cols-2 gap-4 xl:contents">
                                <label class="flex min-w-0 flex-col gap-2">
                                    <span class="text-sm font-medium text-preto">Quantidade</span>
                                    <input type="number" min="0" max="999" step="0.01" data-item-field="quantity" value="${escapeAttribute(item.quantity)}"
                                        class="h-12 rounded-[8px] border border-[#e2e2e2] bg-white px-4 text-sm text-preto outline-none transition-colors focus:border-verde"
                                        placeholder="0" />
                                </label>

                                <div class="min-w-0">
                                    <div class="grid gap-4">
                                        <label class="flex min-w-0 flex-col gap-2">
                                            <span class="text-sm font-medium text-preto">Unidade</span>
                                            <select data-item-field="unit"
                                                class="h-12 rounded-[8px] border border-[#e2e2e2] bg-white px-4 text-sm text-preto outline-none transition-colors focus:border-verde">
                                                ${seed.unitOptions
                                                    .map(
                                                        (option) => `
                                                            <option value="${option.value}" ${option.value === item.unit ? 'selected' : ''}>
                                                                ${option.label}
                                                            </option>
                                                        `
                                                    )
                                                    .join('')}
                                            </select>
                                        </label>

                                        ${
                                            item.unit === 'custom'
                                                ? `
                                                    <label class="flex min-w-0 flex-col gap-2">
                                                        <span class="text-sm font-medium text-preto">Outra unidade</span>
                                                        <input type="text" data-item-field="customUnit" maxlength="10" value="${escapeAttribute(item.customUnit)}"
                                                            class="h-12 rounded-[8px] border border-[#e2e2e2] bg-white px-4 text-sm text-preto outline-none transition-colors focus:border-verde"
                                                            placeholder="Ex.: diária, lote, conjunto" />
                                                    </label>
                                                `
                                                : ''
                                        }
                                    </div>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4 xl:contents">
                                <label class="flex min-w-0 flex-col gap-2">
                                    <span class="text-sm font-medium text-preto">Preço unitário</span>
                                    <input type="number" min="0" max="999999" step="0.01" data-item-field="unitPrice" value="${escapeAttribute(item.unitPrice)}"
                                        class="h-12 rounded-[8px] border border-[#e2e2e2] bg-white px-4 text-sm text-preto outline-none transition-colors focus:border-verde"
                                        placeholder="0,00" />
                                </label>

                                <div class="flex min-w-0 flex-col gap-2">
                                    <span class="text-sm font-medium text-preto">Subtotal</span>
                                    <div class="flex h-12 min-w-0 items-center rounded-[8px] border border-[#e2e2e2] bg-[#f2f8ef] px-4 text-sm font-semibold text-preto"
                                        data-item-subtotal>
                                        ${formatCurrency(subtotal)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </article>
                `
            })
            .join('')
    }

    function refreshEditorSummary() {
        const budget = getSelectedBudget()
        if (!budget) {
            return
        }

        const client = getClientById(budget.clientId)
        const statusClasses = statusClassMap[budget.status] || statusClassMap.Rascunho

        if (elements.editorTitle) {
            elements.editorTitle.textContent = budget.name || 'Novo orçamento'
        }
        if (elements.summaryStatusBadge) {
            elements.summaryStatusBadge.className = `inline-flex h-8 items-center justify-center rounded-full px-4 text-xs font-medium ${statusClasses}`
            elements.summaryStatusBadge.textContent = budget.status
        }
        if (elements.summaryClient) {
            elements.summaryClient.textContent = client ? client.name : 'Não selecionado'
        }
        if (elements.summaryItems) {
            elements.summaryItems.textContent = `${budget.items.length} ${budget.items.length === 1 ? 'item' : 'itens'}`
        }
        if (elements.summaryTotal) {
            elements.summaryTotal.textContent = formatCurrency(getEffectiveTotal(budget))
        }
        if (elements.summaryValidity) {
            elements.summaryValidity.textContent = budget.validityDate
                ? formatDate(budget.validityDate)
                : 'Não informada'
        }
        if (elements.expiredBanner) {
            elements.expiredBanner.classList.toggle('hidden', !isBudgetExpired(budget))
        }
        renderChecklist()
    }

    function renderChecklist() {
        const budget = getSelectedBudget()
        if (!budget || !elements.exportChecklist) {
            return
        }

        const checklist = [
            {
                label: 'Nome do orçamento',
                done: Boolean(budget.name.trim())
            },
            {
                label: 'Cliente selecionado',
                done: Boolean(getClientById(budget.clientId))
            },
            {
                label: 'Ao menos 1 item',
                done: budget.items.length > 0
            },
            {
                label: 'Valor total calculado',
                done: getEffectiveTotal(budget) > 0
            }
        ]

        elements.exportChecklist.innerHTML = checklist
            .map((item) => {
                const classes = item.done
                    ? 'border-[#dce6d7] bg-[#f2f8ef] text-verde-2'
                    : 'border-[#e2e2e2] bg-[#fbfbfb] text-preto/55'

                return `
                    <div class="flex items-center justify-between rounded-[8px] border px-4 py-3 ${classes}">
                        <span class="text-sm font-medium">${item.label}</span>
                        <span class="text-xs font-semibold uppercase tracking-[0.16em]">${item.done ? 'OK' : 'Pendente'}</span>
                    </div>
                `
            })
            .join('')
    }

    function refreshTotals() {
        const budget = getSelectedBudget()
        if (!budget) {
            return
        }

        const computedTotal = budget.items.reduce((sum, item) => sum + calculateSubtotal(item), 0)
        const effectiveTotal = getEffectiveTotal(budget)
        const overrideActive = hasTotalOverride(budget)

        if (elements.computedTotal) {
            elements.computedTotal.textContent = formatCurrency(computedTotal)
        }
        if (elements.effectiveTotal) {
            if (document.activeElement !== elements.effectiveTotal) {
                elements.effectiveTotal.value = formatCurrency(effectiveTotal)
            }
        }
        if (elements.totalOverrideBadge) {
            elements.totalOverrideBadge.classList.toggle('hidden', !overrideActive)
        }
        if (elements.resetTotalButton) {
            elements.resetTotalButton.classList.toggle('hidden', !overrideActive)
        }
    }

    function refreshToggle() {
        const budget = getSelectedBudget()
        if (!budget || !elements.toggleValuesButton || !elements.toggleValuesThumb) {
            return
        }

        elements.toggleValuesButton.classList.toggle('bg-verde', budget.showValuesInPdf)
        elements.toggleValuesButton.classList.toggle('bg-[#d9d9d9]', !budget.showValuesInPdf)
        elements.toggleValuesThumb.classList.toggle('translate-x-7', budget.showValuesInPdf)
        elements.toggleValuesThumb.classList.toggle('translate-x-1', !budget.showValuesInPdf)
    }

    function refreshOtherPaymentVisibility() {
        const budget = getSelectedBudget()

        if (!budget || !elements.otherPaymentWrapper) {
            return
        }

        elements.otherPaymentWrapper.classList.toggle(
            'hidden',
            !budget.paymentMethods.includes('other')
        )
    }

    function renderPaymentOptions() {
        const budget = getSelectedBudget()
        const selectedMethods = new Set(
            budget ? budget.paymentMethods : state.budgetDefaults.defaultPaymentMethods
        )

        elements.paymentOptions.innerHTML = seed.paymentOptions
            .map(
                (option) => `
                    <label class="flex items-center gap-3 rounded-[8px] border border-[#e2e2e2] bg-white px-4 py-3 text-sm font-medium text-preto">
                        <input type="checkbox" data-payment-option value="${option.value}" ${
                            selectedMethods.has(option.value) ? 'checked' : ''
                        }
                            class="size-4 rounded border-[#bababa] text-verde focus:ring-verde" />
                        <span>${option.label}</span>
                    </label>
                `
            )
            .join('')
    }

    function renderProfileCard() {
        const profile = getCurrentCompanyProfile()

        if (elements.profileCompanyName) {
            elements.profileCompanyName.textContent = profile.companyName
        }
        if (elements.profileEmail) {
            elements.profileEmail.textContent = profile.email
        }
        if (elements.profilePhone) {
            elements.profilePhone.textContent = profile.phone
        }
        if (elements.profileDocument) {
            elements.profileDocument.textContent = profile.cnpj
        }
        if (elements.profileAddress) {
            elements.profileAddress.textContent = profile.address
        }
    }

    function getCurrentCompanyProfile() {
        if (companyStore) {
            state.profile = companyStore.loadCompany(seed.profile)
        }

        return state.profile
    }

    function normalizeClientSearch(value) {
        return String(value || '').trim().toLowerCase()
    }

    function setClientSearchTerm(context, value) {
        if (context === 'new-budget') {
            state.newBudgetDraft.search = value
            return
        }

        state.editorClientSearch = value
    }

    function getClientSearchTerm(context) {
        return context === 'new-budget' ? state.newBudgetDraft.search : state.editorClientSearch
    }

    function getSelectedClientForContext(context) {
        if (context === 'new-budget') {
            return getClientById(state.newBudgetDraft.clientId)
        }

        const budget = getSelectedBudget()
        return budget ? getClientById(budget.clientId) : null
    }

    function syncClientHelpText(context, { hasResults = true } = {}) {
        const help = context === 'editor' ? elements.editorClientHelp : elements.newBudgetClientHelp

        if (!help) {
            return
        }

        if (!hasResults) {
            help.textContent = 'Nenhum cliente encontrado com essa busca. Você pode criar um novo agora.'
            return
        }
    }

    function openClientDropdown(context) {
        const input = context === 'editor' ? elements.editorClientSearch : elements.newBudgetClientSearch

        if (!input) {
            return
        }

        const selectedClient = getSelectedClientForContext(context)
        const currentValue = input.value
        const hasCustomSearch =
            normalizeClientSearch(currentValue) &&
            normalizeClientSearch(currentValue) !== normalizeClientSearch(selectedClient ? selectedClient.name : '')

        setClientSearchTerm(context, hasCustomSearch ? currentValue : '')
        state.activeClientDropdown = context
        renderClientResults(context)
    }

    function scheduleClientDropdownOpen(context) {
        window.setTimeout(() => {
            const input = context === 'editor' ? elements.editorClientSearch : elements.newBudgetClientSearch

            if (!input || document.activeElement !== input) {
                return
            }

            openClientDropdown(context)
        }, 0)
    }

    function renderClientResults(context) {
        const dropdown = context === 'editor' ? elements.editorClientResults : elements.newBudgetClientResults
        const input = context === 'editor' ? elements.editorClientSearch : elements.newBudgetClientSearch
        const help = context === 'editor' ? elements.editorClientHelp : elements.newBudgetClientHelp

        if (!dropdown || !input) {
            return
        }

        if (state.activeClientDropdown !== context) {
            dropdown.classList.add('hidden')
            return
        }

        const searchTerm = normalizeClientSearch(getClientSearchTerm(context))
        const filteredClients = state.clients.filter((client) => {
            if (!searchTerm) {
                return true
            }

            return (
                client.name.toLowerCase().includes(searchTerm) ||
                client.email.toLowerCase().includes(searchTerm) ||
                client.document.toLowerCase().includes(searchTerm)
            )
        })

        dropdown.innerHTML = `
            <div class="max-h-[240px] overflow-y-auto">
                ${filteredClients
                    .map(
                        (client) => `
                            <button type="button" data-client-select="${client.id}" data-client-context="${context}"
                                class="flex w-full items-start justify-between gap-4 rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-[#f3f3f3]">
                                <div class="min-w-0">
                                    <p class="truncate text-sm font-semibold text-preto">${escapeHtml(client.name)}</p>
                                    <p class="mt-1 truncate text-xs font-light text-preto/60">${escapeHtml(
                                        client.email || client.phone || client.document || 'Sem dados adicionais'
                                    )}</p>
                                </div>
                                <span class="rounded-full bg-[#f2f8ef] px-3 py-1 text-[11px] font-medium text-verde-2">Selecionar</span>
                            </button>
                        `
                    )
                    .join('')}
            </div>
            <div class="mt-2 border-t border-[#e2e2e2] pt-2">
                <button type="button" data-open-new-client="${context}"
                    class="flex w-full items-center justify-between rounded-[12px] px-3 py-3 text-left transition-colors hover:bg-[#f3f3f3]">
                    <span class="text-sm font-medium text-preto">Adicionar novo cliente</span>
                    <span class="rounded-full bg-preto px-3 py-1 text-[11px] font-semibold text-white">Novo</span>
                </button>
            </div>
        `

        dropdown.classList.remove('hidden')
        if (filteredClients.length) {
            syncClientHelpText(context)
        }

        if (!filteredClients.length) {
            syncClientHelpText(context, { hasResults: false })
        }
    }

    function openNewBudgetModal() {
        resetNewBudgetDraft()
        elements.newBudgetModal?.classList.remove('hidden')
        elements.newBudgetModal?.classList.add('flex')
        state.activeClientDropdown = null
        if (elements.nextBudgetNumber) {
            elements.nextBudgetNumber.textContent = `#${getNextBudgetNumber()}`
        }
        if (elements.newBudgetName) {
            elements.newBudgetName.value = ''
        }
        if (elements.newBudgetClientSearch) {
            elements.newBudgetClientSearch.value = ''
        }
    }

    function closeNewBudgetModal() {
        elements.newBudgetModal?.classList.add('hidden')
        elements.newBudgetModal?.classList.remove('flex')
        state.activeClientDropdown = null
        renderClientResults('new-budget')
    }

    function resetNewBudgetDraft() {
        state.newBudgetDraft = {
            name: '',
            clientId: null,
            search: ''
        }
        if (elements.newBudgetClientHelp) {
            elements.newBudgetClientHelp.textContent =
                'Se o cliente ainda não existir, basta clicar em adicionar novo cliente.'
        }
    }

    function createBudgetFromDraft() {
        const budgetName = limitTextValue(
            (elements.newBudgetName?.value || '').trim(),
            MAX_BUDGET_NAME_LENGTH
        )
        const selectedClient = getClientById(state.newBudgetDraft.clientId)

        if (!budgetName) {
            window.alert('Informe um nome para o orçamento.')
            return
        }

        if (!selectedClient) {
            window.alert('Selecione um cliente antes de criar o orçamento.')
            return
        }

        const now = new Date().toISOString()
        const newBudget = {
            id: getNextBudgetNumber(),
            number: getNextBudgetNumber(),
            name: budgetName,
            clientId: selectedClient.id,
            description: '',
            status: 'Rascunho',
            createdAt: now,
            updatedAt: now,
            showValuesInPdf: false,
            totalOverride: '',
            validityDate: '',
            paymentMethods: [...state.budgetDefaults.defaultPaymentMethods],
            otherPaymentMethod: '',
            paymentConditions: limitTextValue(
                state.budgetDefaults.defaultPaymentConditions,
                MAX_PAYMENT_CONDITIONS_LENGTH
            ),
            observations: '',
            items: [createBlankItem()]
        }

        state.budgets.unshift(normalizeBudgetData(newBudget))
        persistCollections()
        closeNewBudgetModal()
        renderDashboard()
        openEditor(newBudget.id)
    }

    function openNewClientModal(context) {
        state.clientModalContext = context
        hideNewClientFormError()
        elements.newClientModal?.classList.remove('hidden')
        elements.newClientModal?.classList.add('flex')
        if (elements.newClientName) {
            elements.newClientName.value = ''
        }
        if (elements.newClientEmail) {
            elements.newClientEmail.value = ''
        }
        if (elements.newClientPhone) {
            elements.newClientPhone.value = ''
        }
        if (elements.newClientAddress) {
            elements.newClientAddress.value = ''
        }
        if (elements.newClientDocument) {
            elements.newClientDocument.value = ''
        }
    }

    function closeNewClientModal() {
        hideNewClientFormError()
        elements.newClientModal?.classList.add('hidden')
        elements.newClientModal?.classList.remove('flex')
    }

    function saveNewClient() {
        const clientName = (elements.newClientName?.value || '').trim()

        if (!clientName) {
            showNewClientFormError()
            return
        }

        hideNewClientFormError()

        const clientPayload = {
            name: clientName,
            email: (elements.newClientEmail?.value || '').trim(),
            phone: (elements.newClientPhone?.value || '').trim(),
            address: (elements.newClientAddress?.value || '').trim(),
            document: (elements.newClientDocument?.value || '').trim()
        }
        let newClient = null

        if (clientStore) {
            const result = clientStore.createClient(state.clients, clientPayload)
            newClient = result.client
            state.clients = result.clients
        } else {
            newClient = {
                id: getNextClientId(),
                ...clientPayload
            }
            state.clients.unshift(newClient)
        }

        persistCollections()
        closeNewClientModal()

        if (state.clientModalContext === 'new-budget') {
            state.newBudgetDraft.clientId = newClient.id
            setClientSearchTerm('new-budget', '')
            if (elements.newBudgetClientSearch) {
                elements.newBudgetClientSearch.value = newClient.name
            }
            if (elements.newBudgetClientHelp) {
                elements.newBudgetClientHelp.textContent = `Cliente selecionado: ${newClient.name}`
            }
            state.activeClientDropdown = null
            renderClientResults('new-budget')
            return
        }

        const budget = getSelectedBudget()
        if (!budget) {
            return
        }

        budget.clientId = newClient.id
        budget.updatedAt = new Date().toISOString()
        setClientSearchTerm('editor', '')
        if (elements.editorClientSearch) {
            elements.editorClientSearch.value = newClient.name
        }
        state.activeClientDropdown = null
        renderClientResults('editor')
        refreshEditorSummary()
        renderDashboard()
        queueSave()
    }

    function showNewClientFormError() {
        if (elements.newClientFormError) {
            elements.newClientFormError.textContent =
                'Informe o nome do cliente para concluir o cadastro.'
            elements.newClientFormError.classList.remove('hidden')
        }

        if (elements.newClientName) {
            elements.newClientName.setAttribute('aria-invalid', 'true')
            elements.newClientName.style.borderColor = '#f0b4b4'
            elements.newClientName.style.backgroundColor = '#fff5f5'
            elements.newClientName.focus()
        }
    }

    function hideNewClientFormError() {
        elements.newClientFormError?.classList.add('hidden')

        if (elements.newClientName) {
            elements.newClientName.removeAttribute('aria-invalid')
            elements.newClientName.style.borderColor = ''
            elements.newClientName.style.backgroundColor = ''
        }
    }

    function openPreviewDrawer() {
        const budget = getSelectedBudget()

        if (!budget) {
            window.alert('Abra um orçamento para visualizar o preview do PDF.')
            return
        }

        state.previewOpen = true
        elements.previewDrawer?.classList.remove('hidden')
        elements.previewDrawer?.classList.remove('pointer-events-none')
        elements.previewDrawer?.classList.add('pointer-events-auto')
        requestAnimationFrame(() => {
            elements.previewPanel?.classList.remove('translate-x-full')
            const backdrop = elements.previewDrawer?.querySelector('[data-close-preview]')
            backdrop?.classList.remove('opacity-0')
        })
        renderPreview()
    }

    function closePreviewDrawer() {
        state.previewOpen = false
        elements.previewPanel?.classList.add('translate-x-full')
        const backdrop = elements.previewDrawer?.querySelector('[data-close-preview]')
        backdrop?.classList.add('opacity-0')

        window.setTimeout(() => {
            elements.previewDrawer?.classList.add('hidden')
            elements.previewDrawer?.classList.remove('pointer-events-auto')
            elements.previewDrawer?.classList.add('pointer-events-none')
        }, 220)
    }

    async function renderPreview() {
        const budget = getSelectedBudget()
        const client = budget ? getClientById(budget.clientId) : null

        if (!budget || !elements.previewFrame || !elements.previewStatus) {
            return
        }

        const currentToken = ++state.previewRequestToken
        elements.previewStatus.textContent = 'Atualizando preview'
        elements.previewStatus.className =
            'inline-flex h-10 items-center justify-center rounded-full bg-[#fff1df] px-4 text-sm font-medium text-laranja'

        try {
            const response = await fetch('/orcamentos/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: getCurrentCompanyProfile(),
                    client,
                    budget
                })
            })

            if (!response.ok) {
                throw new Error('Falha ao gerar preview')
            }

            const html = await response.text()

            if (currentToken !== state.previewRequestToken) {
                return
            }

            elements.previewFrame.srcdoc = html
            elements.previewStatus.textContent = 'Preview atualizado'
            elements.previewStatus.className =
                'inline-flex h-10 items-center justify-center rounded-full bg-[#f2f8ef] px-4 text-sm font-medium text-verde-2'
        } catch (error) {
            console.error(error)
            elements.previewStatus.textContent = 'Erro no preview'
            elements.previewStatus.className =
                'inline-flex h-10 items-center justify-center rounded-full bg-[#f7d7d7] px-4 text-sm font-medium text-[#b42318]'
        }
    }

    function attemptExport(options = {}) {
        const budgetId =
            options.budgetId ??
            state.exportRequest.budgetId ??
            state.selectedBudgetId
        const budget = getBudgetById(budgetId)

        if (!budget) {
            window.alert('Abra um orçamento antes de exportar.')
            return
        }

        state.exportRequest = {
            budgetId: budget.id,
            triggerButton: options.triggerButton ?? state.exportRequest.triggerButton ?? null
        }

        const missingFields = getExportMissingFields(budget)

        if (missingFields.length > 0 && !options.force) {
            openExportWarningModal(missingFields)
            return
        }

        exportCurrentBudget({
            budget,
            triggerButton: state.exportRequest.triggerButton
        })
    }

    async function exportCurrentBudget({ budget, triggerButton } = {}) {
        const targetBudget = budget || getSelectedBudget()
        const actionButton = triggerButton || elements.exportButton || null
        const originalLabel = actionButton ? actionButton.textContent : ''
        const client = budget ? getClientById(budget.clientId) : null

        if (!targetBudget) {
            return
        }

        if (actionButton) {
            actionButton.disabled = true
            actionButton.textContent = 'Exportando...'
        }

        try {
            const response = await fetch('/orcamentos/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: getCurrentCompanyProfile(),
                    client,
                    budget: targetBudget
                })
            })

            if (!response.ok) {
                throw new Error('Erro ao exportar PDF')
            }

            const blob = await response.blob()
            const downloadUrl = window.URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = downloadUrl
            anchor.download = `${slugify(targetBudget.name || `orcamento-${targetBudget.number}`)}.pdf`
            document.body.appendChild(anchor)
            anchor.click()
            anchor.remove()
            window.URL.revokeObjectURL(downloadUrl)
        } catch (error) {
            console.error(error)
            window.alert('Não foi possível exportar o PDF agora.')
        } finally {
            if (actionButton) {
                actionButton.disabled = false
                actionButton.textContent = originalLabel
            }
        }
    }

    function openExportWarningModal(missingFields) {
        if (!elements.exportWarningList) {
            return
        }

        elements.exportWarningList.innerHTML = missingFields
            .map(
                (field) => `
                    <div class="rounded-[8px] border border-[#e2e2e2] bg-[#fbfbfb] px-4 py-4 text-sm font-medium text-preto">
                        ${field}
                    </div>
                `
            )
            .join('')

        elements.exportWarningModal?.classList.remove('hidden')
        elements.exportWarningModal?.classList.add('flex')
    }

    function closeExportWarningModal() {
        elements.exportWarningModal?.classList.add('hidden')
        elements.exportWarningModal?.classList.remove('flex')
    }

    function openDeleteBudgetModal(budgetId) {
        const budget = getBudgetById(budgetId)

        if (!budget) {
            return
        }

        state.pendingDeleteBudgetId = budget.id
        state.openActionMenuBudgetId = null
        if (elements.deleteBudgetName) {
            elements.deleteBudgetName.textContent = budget.name || `Orçamento #${budget.number}`
        }
        elements.deleteBudgetModal?.classList.remove('hidden')
        elements.deleteBudgetModal?.classList.add('flex')
        renderBudgetList()
    }

    function closeDeleteBudgetModal() {
        state.pendingDeleteBudgetId = null
        elements.deleteBudgetModal?.classList.add('hidden')
        elements.deleteBudgetModal?.classList.remove('flex')
    }

    function confirmDeleteBudget() {
        const budget = getBudgetById(state.pendingDeleteBudgetId)
        closeDeleteBudgetModal()

        if (!budget) {
            return
        }

        const deletedBudgetId = budget.id

        state.budgets = state.budgets.filter((entry) => entry.id !== deletedBudgetId)
        state.openActionMenuBudgetId = null
        state.exportRequest = {
            budgetId:
                state.exportRequest.budgetId === deletedBudgetId
                    ? null
                    : state.exportRequest.budgetId,
            triggerButton: null
        }

        if (state.selectedBudgetId === deletedBudgetId) {
            state.selectedBudgetId = null

            if (state.previewOpen) {
                closePreviewDrawer()
            }

            if (elements.editorView && getComputedStyle(elements.editorView).display !== 'none') {
                showListView()
            } else {
                updateQueryParam(null)
            }
        }

        persistCollections()
    }

    function handleBudgetTableAction(event) {
        const actionButton = event.target.closest('[data-action]')

        if (!actionButton) {
            return
        }

        const action = actionButton.dataset.action
        const budgetId = Number.parseInt(actionButton.dataset.budgetId || '', 10)

        if (!Number.isFinite(budgetId)) {
            return
        }

        if (action === 'toggle-menu') {
            state.openActionMenuBudgetId =
                state.openActionMenuBudgetId === budgetId ? null : budgetId
            renderBudgetList()
            return
        }

        if (action === 'edit') {
            state.openActionMenuBudgetId = null
            openEditor(budgetId)
            return
        }

        if (action === 'preview') {
            state.openActionMenuBudgetId = null
            state.selectedBudgetId = budgetId
            openPreviewDrawer()
            renderBudgetList()
            return
        }

        if (action === 'export') {
            state.openActionMenuBudgetId = null
            renderBudgetList()
            attemptExport({ budgetId, force: false, triggerButton: null })
            return
        }

        if (action === 'delete') {
            openDeleteBudgetModal(budgetId)
        }
    }

    function handleBudgetListChange(event) {
        const select = event.target.closest('[data-budget-status-select]')

        if (!select) {
            return
        }

        const budgetId = Number.parseInt(select.dataset.budgetStatusSelect || '', 10)
        const budget = getBudgetById(budgetId)

        if (!budget || budget.status === select.value) {
            return
        }

        budget.status = select.value
        budget.updatedAt = new Date().toISOString()

        if (state.selectedBudgetId === budget.id) {
            refreshEditorSummary()
        }

        renderDashboard()
        queueSave()
    }

    function handleClientDropdownAction(event) {
        const selectButton = event.target.closest('[data-client-select]')
        const openClientButton = event.target.closest('[data-open-new-client]')

        if (selectButton) {
            const clientId = Number.parseInt(selectButton.dataset.clientSelect || '', 10)
            const context = selectButton.dataset.clientContext
            const client = getClientById(clientId)

            if (!client) {
                return
            }

            if (context === 'new-budget') {
                state.newBudgetDraft.clientId = client.id
                setClientSearchTerm('new-budget', '')
                if (elements.newBudgetClientSearch) {
                    elements.newBudgetClientSearch.value = client.name
                }
                if (elements.newBudgetClientHelp) {
                    elements.newBudgetClientHelp.textContent = `Cliente selecionado: ${client.name}`
                }
                state.activeClientDropdown = null
                renderClientResults('new-budget')
                return
            }

            const budget = getSelectedBudget()
            if (!budget) {
                return
            }

            budget.clientId = client.id
            budget.updatedAt = new Date().toISOString()
            setClientSearchTerm('editor', '')
            if (elements.editorClientSearch) {
                elements.editorClientSearch.value = client.name
            }
            state.activeClientDropdown = null
            renderClientResults('editor')
            refreshEditorSummary()
            renderDashboard()
            queueSave()
            return
        }

        if (openClientButton) {
            const context = openClientButton.dataset.openNewClient || 'new-budget'
            state.activeClientDropdown = null
            renderClientResults(context)
            openNewClientModal(context)
        }
    }

    function handleItemInput(event) {
        const target = event.target.closest('[data-item-field]')
        const row = event.target.closest('[data-item-id]')
        const budget = getSelectedBudget()

        if (!target || !row || !budget) {
            return
        }

        const item = budget.items.find((entry) => entry.id === row.dataset.itemId)

        if (!item) {
            return
        }

        const normalizedValue = normalizeBudgetItemFieldValue(
            target.dataset.itemField,
            target.value
        )

        if (target.value !== normalizedValue) {
            target.value = normalizedValue
        }

        item[target.dataset.itemField] = normalizedValue
        budget.updatedAt = new Date().toISOString()

        if (target.dataset.itemField === 'unit') {
            if (target.value !== 'custom') {
                item.customUnit = ''
            }
            renderItems()
        } else {
            const subtotalElement = row.querySelector('[data-item-subtotal]')
            if (subtotalElement) {
                subtotalElement.textContent = formatCurrency(calculateSubtotal(item))
            }
        }

        refreshTotals()
        refreshEditorSummary()
        queueSave()
    }

    function handleItemClick(event) {
        const removeButton = event.target.closest('[data-remove-item]')
        const budget = getSelectedBudget()

        if (!removeButton || !budget) {
            return
        }

        budget.items = budget.items.filter((item) => item.id !== removeButton.dataset.removeItem)
        budget.updatedAt = new Date().toISOString()
        renderItems()
        refreshTotals()
        refreshEditorSummary()
        queueSave()
    }

    function handleItemDragStart(event) {
        const row = event.target.closest('[data-item-id]')
        if (!row) {
            return
        }

        state.draggingItemId = row.dataset.itemId
        row.classList.add('opacity-50')
    }

    function handleItemDragOver(event) {
        const row = event.target.closest('[data-item-id]')
        if (!row) {
            return
        }

        event.preventDefault()
        row.classList.add('ring-2', 'ring-verde/25')
    }

    function handleItemDragLeave(event) {
        const row = event.target.closest('[data-item-id]')
        if (!row) {
            return
        }

        row.classList.remove('ring-2', 'ring-verde/25')
    }

    function handleItemDrop(event) {
        const targetRow = event.target.closest('[data-item-id]')
        const budget = getSelectedBudget()

        if (!targetRow || !budget || !state.draggingItemId) {
            return
        }

        event.preventDefault()

        const draggingIndex = budget.items.findIndex((item) => item.id === state.draggingItemId)
        const targetIndex = budget.items.findIndex((item) => item.id === targetRow.dataset.itemId)

        if (draggingIndex < 0 || targetIndex < 0 || draggingIndex === targetIndex) {
            clearDragStyles()
            return
        }

        const [movedItem] = budget.items.splice(draggingIndex, 1)
        budget.items.splice(targetIndex, 0, movedItem)
        budget.updatedAt = new Date().toISOString()
        renderItems()
        refreshEditorSummary()
        queueSave()
        clearDragStyles()
    }

    function clearDragStyles() {
        state.draggingItemId = null
        elements.itemList
            ?.querySelectorAll('[data-item-id]')
            .forEach((row) => row.classList.remove('opacity-50', 'ring-2', 'ring-verde/25'))
    }

    function handleDocumentClick(event) {
        const clickedInsideBudgetActions = event.target.closest('[data-budget-action-root]')
        const clickedInsideNewBudget =
            event.target.closest('[data-new-budget-client-search]') ||
            event.target.closest('[data-new-budget-client-results]')
        const clickedInsideEditor =
            event.target.closest('[data-editor-client-search]') ||
            event.target.closest('[data-editor-client-results]')

        if (!clickedInsideBudgetActions && state.openActionMenuBudgetId !== null) {
            state.openActionMenuBudgetId = null
            renderBudgetList()
        }

        if (!clickedInsideNewBudget && state.activeClientDropdown === 'new-budget') {
            state.activeClientDropdown = null
            renderClientResults('new-budget')
        }

        if (!clickedInsideEditor && state.activeClientDropdown === 'editor') {
            state.activeClientDropdown = null
            renderClientResults('editor')
        }
    }

    function queueSave() {
        setSaveState('saving')
        window.clearTimeout(state.saveTimer)
        state.saveTimer = window.setTimeout(() => {
            persistCollections()
            setSaveState('saved')
        }, 1200)

        if (state.previewOpen) {
            window.clearTimeout(state.previewTimer)
            state.previewTimer = window.setTimeout(() => {
                renderPreview()
            }, 600)
        }

        renderDashboard()
    }

    function flushSave() {
        if (state.saveTimer) {
            window.clearTimeout(state.saveTimer)
            persistCollections()
            setSaveState('saved')
        }
    }

    function persistCollections() {
        if (!companyStore) {
            localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(state.profile))
        }
        localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(state.clients))
        localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(state.budgets))
        state.lastSavedAt = new Date()
        renderDashboard()
    }

    function setSaveState(nextState) {
        state.saveState = nextState
        updateSaveIndicator()
    }

    function updateSaveIndicator() {
        if (!elements.saveIndicator) {
            return
        }

        elements.saveIndicator.className = `inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium ${saveIndicatorClassMap[state.saveState]}`

        if (state.saveState === 'saving') {
            elements.saveIndicator.textContent = 'Salvando...'
            return
        }

        if (state.lastSavedAt) {
            elements.saveIndicator.textContent = `Salvo às ${new Intl.DateTimeFormat('pt-BR', {
                hour: '2-digit',
                minute: '2-digit'
            }).format(state.lastSavedAt)}`
            return
        }

        elements.saveIndicator.textContent = 'Salvo'
    }

    function getFilteredBudgets() {
        const searchTerm = state.filters.search.trim().toLowerCase()

        return [...state.budgets]
            .sort((firstBudget, secondBudget) => {
                return new Date(secondBudget.updatedAt) - new Date(firstBudget.updatedAt)
            })
            .filter((budget) => {
                if (state.filters.status !== 'all' && budget.status !== state.filters.status) {
                    return false
                }

                if (!searchTerm) {
                    return true
                }

                const client = getClientById(budget.clientId)
                const haystack = [
                    budget.name,
                    budget.description,
                    client ? client.name : '',
                    client ? client.email : ''
                ]
                    .join(' ')
                    .toLowerCase()

                return haystack.includes(searchTerm)
            })
    }

    function getSelectedBudget() {
        return state.budgets.find((budget) => budget.id === state.selectedBudgetId) || null
    }

    function getBudgetById(budgetId) {
        return state.budgets.find((budget) => budget.id === budgetId) || null
    }

    function getClientById(clientId) {
        return state.clients.find((client) => client.id === clientId) || null
    }

    function getNextBudgetNumber() {
        return state.budgets.reduce((max, budget) => Math.max(max, budget.number), 0) + 1
    }

    function getNextClientId() {
        return state.clients.reduce((max, client) => Math.max(max, client.id), 0) + 1
    }

    function normalizeBudgetCollection(collection) {
        const sourceBudgets = Array.isArray(collection) ? collection : cloneValue(seed.budgets)
        return sourceBudgets.map((budget, index) =>
            normalizeBudgetData(budget, seed.budgets[index] || seed.budgets[0])
        )
    }

    function normalizeBudgetData(budget, fallback = seed.budgets[0]) {
        const source =
            budget && typeof budget === 'object' && !Array.isArray(budget) ? budget : fallback
        const itemsSource = Array.isArray(source.items) ? source.items : fallback.items

        return {
            ...source,
            id: Number.isFinite(Number(source.id)) ? Number(source.id) : fallback.id,
            number: Number.isFinite(Number(source.number)) ? Number(source.number) : fallback.number,
            name: limitTextValue(
                typeof source.name === 'string' ? source.name : fallback.name,
                MAX_BUDGET_NAME_LENGTH
            ),
            description: limitTextValue(source.description || '', MAX_PROJECT_DESCRIPTION_LENGTH),
            status: budgetStatusOptions.includes(source.status) ? source.status : 'Rascunho',
            totalOverride: normalizeAmountForStorage(source.totalOverride),
            otherPaymentMethod: limitTextValue(
                source.otherPaymentMethod || '',
                MAX_OTHER_PAYMENT_LENGTH
            ),
            paymentConditions: limitTextValue(
                source.paymentConditions || '',
                MAX_PAYMENT_CONDITIONS_LENGTH
            ),
            observations: limitTextValue(source.observations || '', MAX_OBSERVATIONS_LENGTH),
            items: itemsSource
                .slice(0, MAX_BUDGET_ITEMS)
                .map((item, index) => normalizeBudgetItemData(item, index + 1))
        }
    }

    function normalizeBudgetItemData(item, index) {
        const source = item && typeof item === 'object' && !Array.isArray(item) ? item : {}

        return {
            ...source,
            id: source.id || `item-${index}`,
            itemId: Number.isFinite(Number(source.itemId)) ? Number(source.itemId) : null,
            description: limitTextValue(source.description || '', MAX_ITEM_DESCRIPTION_LENGTH),
            quantity: normalizeNumericFieldValue(source.quantity, MAX_ITEM_QUANTITY),
            unit: source.unit || 'un',
            customUnit: limitTextValue(source.customUnit || '', MAX_CUSTOM_UNIT_LENGTH),
            unitPrice: normalizeNumericFieldValue(source.unitPrice, MAX_UNIT_PRICE)
        }
    }

    function limitTextValue(value, maxLength) {
        return String(value || '').slice(0, maxLength)
    }

    function normalizeBudgetItemFieldValue(field, value) {
        if (field === 'description') {
            return limitTextValue(value, MAX_ITEM_DESCRIPTION_LENGTH)
        }

        if (field === 'customUnit') {
            return limitTextValue(value, MAX_CUSTOM_UNIT_LENGTH)
        }

        if (field === 'quantity') {
            return normalizeNumericFieldValue(value, MAX_ITEM_QUANTITY)
        }

        if (field === 'unitPrice') {
            return normalizeNumericFieldValue(value, MAX_UNIT_PRICE)
        }

        return String(value ?? '')
    }

    function normalizeNumericFieldValue(value, maxValue) {
        const rawValue = String(value ?? '').trim()

        if (!rawValue) {
            return ''
        }

        const amount = parseAmount(rawValue)

        if (!Number.isFinite(amount) || amount < 0) {
            return ''
        }

        if (amount > maxValue) {
            return formatNumberInputValue(maxValue)
        }

        if (!/^\d*\.?\d*$/.test(rawValue)) {
            return formatNumberInputValue(amount)
        }

        return rawValue
    }

    function normalizeEditableTotalInputValue(value) {
        const sanitizedValue = String(value ?? '').replace(/[^\d.,]/g, '')

        if (!sanitizedValue.trim()) {
            return ''
        }

        const amount = parseAmount(sanitizedValue)

        if (!Number.isFinite(amount) || amount < 0) {
            return ''
        }

        if (amount > MAX_TOTAL_AMOUNT) {
            return formatEditableAmount(MAX_TOTAL_AMOUNT)
        }

        return sanitizedValue
    }

    function formatNumberInputValue(value) {
        return Number.isInteger(value) ? String(value) : String(value.toFixed(2))
    }

    function clampAmount(value, maxValue) {
        if (!Number.isFinite(value)) {
            return 0
        }

        return Math.min(Math.max(value, 0), maxValue)
    }

    function getEffectiveTotal(budget) {
        const overrideValue = clampAmount(parseAmount(budget.totalOverride), MAX_TOTAL_AMOUNT)
        return hasTotalOverride(budget) ? overrideValue : getComputedTotal(budget)
    }

    function getComputedTotal(budget) {
        return clampAmount(
            budget.items.reduce((sum, item) => sum + calculateSubtotal(item), 0),
            MAX_TOTAL_AMOUNT
        )
    }

    function hasTotalOverride(budget) {
        return budget.totalOverride !== '' && clampAmount(parseAmount(budget.totalOverride), MAX_TOTAL_AMOUNT) > 0
    }

    function calculateSubtotal(item) {
        return clampAmount(
            clampAmount(parseAmount(item.quantity), MAX_ITEM_QUANTITY) *
                clampAmount(parseAmount(item.unitPrice), MAX_UNIT_PRICE),
            MAX_TOTAL_AMOUNT
        )
    }

    function parseAmount(value) {
        if (value === null || value === undefined || value === '') {
            return 0
        }

        const withoutCurrency = String(value).replace(/[R$\s]/g, '')
        const normalized = withoutCurrency.includes(',')
            ? withoutCurrency.replace(/\./g, '').replace(',', '.')
            : withoutCurrency.replace(',', '.')
        const parsed = Number.parseFloat(normalized)
        return Number.isFinite(parsed) ? parsed : 0
    }

    function formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value || 0)
    }

    function formatEditableAmount(value) {
        return new Intl.NumberFormat('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(clampAmount(parseAmount(value), MAX_TOTAL_AMOUNT))
    }

    function normalizeAmountForStorage(value) {
        const amount = clampAmount(parseAmount(value), MAX_TOTAL_AMOUNT)
        return amount > 0 ? amount.toFixed(2) : ''
    }

    function formatDate(value) {
        if (!value) {
            return 'Não informada'
        }

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

    function isBudgetExpired(budget) {
        if (!budget.validityDate) {
            return false
        }

        if (['Aprovado', 'Recusado'].includes(budget.status)) {
            return false
        }

        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const validity = new Date(`${budget.validityDate}T00:00:00`)

        return validity < today
    }

    function getExportMissingFields(budget) {
        const missingFields = []

        if (!budget.name.trim()) {
            missingFields.push('Nome do orçamento')
        }
        if (!getClientById(budget.clientId)) {
            missingFields.push('Cliente selecionado')
        }
        if (!budget.items.length) {
            missingFields.push('Ao menos 1 item')
        }
        if (getEffectiveTotal(budget) <= 0) {
            missingFields.push('Valor total maior que zero')
        }

        return missingFields
    }

    function createBlankItem() {
        return {
            id: createUid(),
            itemId: null,
            description: '',
            quantity: '',
            unit: 'un',
            customUnit: '',
            unitPrice: ''
        }
    }

    function updateQueryParam(budgetId) {
        const url = new URL(window.location.href)

        if (budgetId) {
            url.searchParams.set('orcamento', String(budgetId))
        } else {
            url.searchParams.delete('orcamento')
        }

        window.history.replaceState({}, '', url.toString())
    }

    function loadCollection(key, fallback) {
        try {
            const storedValue = localStorage.getItem(key)
            return storedValue ? JSON.parse(storedValue) : cloneValue(fallback)
        } catch {
            return cloneValue(fallback)
        }
    }

    function cloneValue(value) {
        if (window.structuredClone) {
            return window.structuredClone(value)
        }

        return JSON.parse(JSON.stringify(value))
    }

    function createUid() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID()
        }

        return `item-${Date.now()}-${Math.random().toString(16).slice(2)}`
    }

    function slugify(value) {
        return String(value)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }

    function escapeAttribute(value) {
        return escapeHtml(value ?? '')
    }
})
