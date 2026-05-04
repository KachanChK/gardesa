document.addEventListener('DOMContentLoaded', () => {
    const seed = window.__CLIENTES_SEED__
    const clientStore = window.GardesaClientStore

    if (!seed || !clientStore) {
        return
    }

    const elements = {
        clientSearch: document.querySelector('[data-client-search]'),
        openClientModalButton: document.querySelector('[data-open-client-modal]'),
        clientsTable: document.querySelector('[data-clients-table]'),
        clientsMobileList: document.querySelector('[data-clients-mobile-list]'),
        clientsEmpty: document.querySelector('[data-clients-empty]'),
        clientsPagination: document.querySelector('[data-clients-pagination]'),
        clientsPageSummary: document.querySelector('[data-clients-page-summary]'),
        clientsPageIndicator: document.querySelector('[data-clients-page-indicator]'),
        clientsPrevPageButton: document.querySelector('[data-clients-prev-page]'),
        clientsNextPageButton: document.querySelector('[data-clients-next-page]'),
        clientModal: document.querySelector('[data-client-modal]'),
        clientModalTitle: document.querySelector('[data-client-modal-title]'),
        clientFormError: document.querySelector('[data-client-form-error]'),
        closeClientModalButtons: document.querySelectorAll('[data-close-client-modal]'),
        clientName: document.querySelector('[data-client-name]'),
        clientEmail: document.querySelector('[data-client-email]'),
        clientPhone: document.querySelector('[data-client-phone]'),
        clientDocument: document.querySelector('[data-client-document]'),
        clientAddress: document.querySelector('[data-client-address]'),
        saveClientButton: document.querySelector('[data-save-client]'),
        deleteClientModal: document.querySelector('[data-delete-client-modal]'),
        deleteClientName: document.querySelector('[data-delete-client-name]'),
        closeDeleteClientButtons: document.querySelectorAll('[data-close-delete-client]'),
        confirmDeleteClientButton: document.querySelector('[data-confirm-delete-client]')
    }

    if (!elements.clientsTable || !elements.clientsMobileList) {
        return
    }

    const state = {
        clients: clientStore.loadClients(seed.clients),
        search: '',
        currentPage: 1,
        editingClientId: null,
        pendingDeleteClientId: null
    }
    const CLIENTS_PER_PAGE = 8

    bindEvents()
    renderClientList()

    function bindEvents() {
        elements.clientSearch?.addEventListener('input', (event) => {
            state.search = event.currentTarget.value
            state.currentPage = 1
            renderClientList()
        })

        elements.openClientModalButton?.addEventListener('click', () => {
            openClientModal()
        })

        elements.closeClientModalButtons.forEach((button) => {
            button.addEventListener('click', closeClientModal)
        })

        elements.saveClientButton?.addEventListener('click', saveClient)
        elements.clientName?.addEventListener('input', () => {
            if ((elements.clientName?.value || '').trim()) {
                hideClientFormError()
            }
        })
        elements.clientsTable?.addEventListener('click', handleClientAction)
        elements.clientsMobileList?.addEventListener('click', handleClientAction)
        elements.clientsPrevPageButton?.addEventListener('click', () => {
            goToClientPage(state.currentPage - 1)
        })
        elements.clientsNextPageButton?.addEventListener('click', () => {
            goToClientPage(state.currentPage + 1)
        })

        elements.closeDeleteClientButtons.forEach((button) => {
            button.addEventListener('click', closeDeleteClientModal)
        })

        elements.confirmDeleteClientButton?.addEventListener('click', confirmDeleteClient)

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') {
                return
            }

            closeDeleteClientModal()
            closeClientModal()
        })
    }

    function renderClientList() {
        const filteredClients = getFilteredClients()
        const totalPages = getTotalPages(filteredClients.length)
        state.currentPage = clampPage(state.currentPage, totalPages)
        const clients = getClientsForCurrentPage(filteredClients)

        elements.clientsEmpty?.classList.toggle('hidden', filteredClients.length !== 0)
        renderPagination(filteredClients.length, totalPages)

        elements.clientsTable.innerHTML = clients
            .map(
                (client) => `
                    <article class="grid min-h-[68px] grid-cols-[86px_minmax(220px,1.35fr)_minmax(220px,1.2fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_112px] items-center gap-x-3 px-6 text-sm text-preto">
                        <div class="flex items-center">${getClientAvatarMarkup(client)}</div>
                        <p class="min-w-0 truncate pr-4 font-medium text-preto">${escapeHtml(client.name || 'Cliente sem nome')}</p>
                        <p class="min-w-0 truncate pr-4 font-normal text-preto">${formatCell(client.email)}</p>
                        <p class="min-w-0 truncate pr-4 font-normal text-preto">${formatCell(client.phone)}</p>
                        <p class="min-w-0 truncate pr-4 font-normal text-preto">${formatCell(client.document)}</p>
                        <div class="flex items-center justify-end gap-2">
                            ${getClientActionButtonMarkup('edit', client.id, 'Editar cliente', '/img/icons/lapis_icon.svg')}
                            ${getClientActionButtonMarkup('delete', client.id, 'Excluir cliente', '/img/icons/deletar_icon.svg')}
                        </div>
                    </article>
                `
            )
            .join('')

        elements.clientsMobileList.innerHTML = clients
            .map(
                (client) => `
                    <article class="flex flex-col gap-4 px-5 py-5">
                        <div class="flex items-start justify-between gap-3">
                            <div class="flex min-w-0 items-center gap-3">
                                ${getClientAvatarMarkup(client)}
                                <div class="min-w-0">
                                    <p class="truncate text-base font-semibold text-preto">${escapeHtml(client.name || 'Cliente sem nome')}</p>
                                    <p class="mt-1 truncate text-sm font-light text-preto/60">${formatCell(client.email)}</p>
                                </div>
                            </div>
                            <div class="flex shrink-0 items-center gap-2">
                                ${getClientActionButtonMarkup('edit', client.id, 'Editar cliente', '/img/icons/lapis_icon.svg', true)}
                                ${getClientActionButtonMarkup('delete', client.id, 'Excluir cliente', '/img/icons/deletar_icon.svg', true)}
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="text-xs font-light uppercase tracking-[0.16em] text-preto/45">Telefone</p>
                                <p class="mt-2 font-medium text-preto">${formatCell(client.phone)}</p>
                            </div>
                            <div>
                                <p class="text-xs font-light uppercase tracking-[0.16em] text-preto/45">CPF/CNPJ</p>
                                <p class="mt-2 font-medium text-preto">${formatCell(client.document)}</p>
                            </div>
                        </div>
                    </article>
                `
            )
            .join('')
    }

    function renderPagination(totalClients, totalPages) {
        const hasClients = totalClients > 0
        elements.clientsPagination?.classList.toggle('hidden', !hasClients)
        elements.clientsPagination?.classList.toggle('flex', hasClients)

        if (!hasClients) {
            return
        }

        const pageStart = (state.currentPage - 1) * CLIENTS_PER_PAGE + 1
        const pageEnd = Math.min(state.currentPage * CLIENTS_PER_PAGE, totalClients)
        const summary = `${pageStart}-${pageEnd} de ${totalClients} clientes`

        if (elements.clientsPageSummary) {
            elements.clientsPageSummary.textContent = summary
        }

        if (elements.clientsPageIndicator) {
            elements.clientsPageIndicator.textContent = `Página ${state.currentPage} de ${totalPages}`
        }

        if (elements.clientsPrevPageButton) {
            elements.clientsPrevPageButton.disabled = state.currentPage <= 1
        }

        if (elements.clientsNextPageButton) {
            elements.clientsNextPageButton.disabled = state.currentPage >= totalPages
        }
    }

    function getClientActionButtonMarkup(action, clientId, label, icon, compact = false) {
        const sizeClass = compact ? 'size-10' : 'size-9'
        const iconSizeClass = compact ? 'size-4' : 'size-4'

        return `
            <button type="button" data-client-action="${action}" data-client-id="${clientId}"
                class="inline-flex ${sizeClass} items-center justify-center rounded-full bg-white transition-colors hover:bg-[#f3f3f3] cursor-pointer"
                aria-label="${label}">
                <img src="${icon}" alt="" class="${iconSizeClass}" />
            </button>
        `
    }

    function getClientAvatarMarkup(client) {
        return `
            <span class="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#d9e6d4] bg-[#f2f8ef] text-sm font-semibold leading-none text-verde-2 shadow-sm" aria-label="Avatar do cliente">
                ${escapeHtml(getClientInitials(client.name))}
            </span>
        `
    }

    function getClientInitials(name) {
        const parts = String(name || '')
            .trim()
            .split(/\s+/)
            .filter(Boolean)

        if (!parts.length) {
            return '?'
        }

        const initials = [parts[0], parts[1]]
            .filter(Boolean)
            .map((part) => Array.from(part)[0])
            .join('')

        return initials.toLocaleUpperCase('pt-BR')
    }

    function getFilteredClients() {
        const searchTerm = normalizeSearch(state.search)

        return clientStore.sortByNewest(state.clients).filter((client) => {
            if (!searchTerm) {
                return true
            }

            return normalizeSearch(client.name).includes(searchTerm)
        })
    }

    function getClientsForCurrentPage(clients) {
        const startIndex = (state.currentPage - 1) * CLIENTS_PER_PAGE
        return clients.slice(startIndex, startIndex + CLIENTS_PER_PAGE)
    }

    function goToClientPage(page) {
        const totalPages = getTotalPages(getFilteredClients().length)
        const nextPage = clampPage(page, totalPages)

        if (nextPage === state.currentPage) {
            return
        }

        state.currentPage = nextPage
        renderClientList()
    }

    function getTotalPages(totalClients) {
        return Math.max(1, Math.ceil(totalClients / CLIENTS_PER_PAGE))
    }

    function clampPage(page, totalPages) {
        return Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), totalPages)
    }

    function openClientModal(clientId = null) {
        const client = Number.isFinite(clientId) ? getClientById(clientId) : null
        state.editingClientId = client ? client.id : null
        hideClientFormError()

        if (elements.clientModalTitle) {
            elements.clientModalTitle.textContent = client ? 'Editar cliente' : 'Cadastrar cliente'
        }

        if (elements.clientName) {
            elements.clientName.value = client ? client.name : ''
        }
        if (elements.clientEmail) {
            elements.clientEmail.value = client ? client.email : ''
        }
        if (elements.clientPhone) {
            elements.clientPhone.value = client ? client.phone : ''
        }
        if (elements.clientDocument) {
            elements.clientDocument.value = client ? client.document : ''
        }
        if (elements.clientAddress) {
            elements.clientAddress.value = client ? client.address : ''
        }

        elements.clientModal?.classList.remove('hidden')
        elements.clientModal?.classList.add('flex')
        window.requestAnimationFrame(() => elements.clientName?.focus())
    }

    function closeClientModal() {
        state.editingClientId = null
        hideClientFormError()
        elements.clientModal?.classList.add('hidden')
        elements.clientModal?.classList.remove('flex')
    }

    function saveClient() {
        const payload = {
            name: (elements.clientName?.value || '').trim(),
            email: (elements.clientEmail?.value || '').trim(),
            phone: (elements.clientPhone?.value || '').trim(),
            document: (elements.clientDocument?.value || '').trim(),
            address: (elements.clientAddress?.value || '').trim()
        }

        if (!payload.name) {
            showClientFormError()
            return
        }

        hideClientFormError()

        if (state.editingClientId) {
            const result = clientStore.updateClient(state.clients, state.editingClientId, payload)
            state.clients = result.clients
        } else {
            const result = clientStore.createClient(state.clients, payload)
            state.clients = result.clients
        }

        clientStore.saveClients(state.clients)
        closeClientModal()
        state.currentPage = 1
        renderClientList()
    }

    function showClientFormError() {
        if (elements.clientFormError) {
            elements.clientFormError.textContent = state.editingClientId
                ? 'Informe o nome do cliente para salvar as alterações.'
                : 'Informe o nome do cliente para concluir o cadastro.'
            elements.clientFormError.classList.remove('hidden')
        }

        if (elements.clientName) {
            elements.clientName.setAttribute('aria-invalid', 'true')
            elements.clientName.style.borderColor = '#f0b4b4'
            elements.clientName.style.backgroundColor = '#fff5f5'
            elements.clientName.focus()
        }
    }

    function hideClientFormError() {
        elements.clientFormError?.classList.add('hidden')

        if (elements.clientName) {
            elements.clientName.removeAttribute('aria-invalid')
            elements.clientName.style.borderColor = ''
            elements.clientName.style.backgroundColor = ''
        }
    }

    function handleClientAction(event) {
        const actionButton = event.target.closest('[data-client-action]')

        if (!actionButton) {
            return
        }

        const clientId = Number.parseInt(actionButton.dataset.clientId || '', 10)

        if (!Number.isFinite(clientId)) {
            return
        }

        if (actionButton.dataset.clientAction === 'edit') {
            openClientModal(clientId)
            return
        }

        if (actionButton.dataset.clientAction === 'delete') {
            openDeleteClientModal(clientId)
        }
    }

    function openDeleteClientModal(clientId) {
        const client = getClientById(clientId)

        if (!client) {
            return
        }

        state.pendingDeleteClientId = client.id
        if (elements.deleteClientName) {
            elements.deleteClientName.textContent = client.name || 'Cliente sem nome'
        }
        elements.deleteClientModal?.classList.remove('hidden')
        elements.deleteClientModal?.classList.add('flex')
    }

    function closeDeleteClientModal() {
        state.pendingDeleteClientId = null
        elements.deleteClientModal?.classList.add('hidden')
        elements.deleteClientModal?.classList.remove('flex')
    }

    function confirmDeleteClient() {
        const client = getClientById(state.pendingDeleteClientId)
        closeDeleteClientModal()

        if (!client) {
            return
        }

        state.clients = clientStore.deleteClient(state.clients, client.id)

        if (state.editingClientId === client.id) {
            closeClientModal()
        }

        clientStore.saveClients(state.clients)
        state.currentPage = clampPage(state.currentPage, getTotalPages(getFilteredClients().length))
        renderClientList()
    }

    function getClientById(clientId) {
        return state.clients.find((client) => client.id === clientId) || null
    }

    function formatCell(value) {
        const normalizedValue = String(value || '').trim()
        return normalizedValue ? escapeHtml(normalizedValue) : '<span class="text-preto/40">-</span>'
    }

    function normalizeSearch(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase()
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
    }
})
