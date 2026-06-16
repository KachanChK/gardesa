type GalleryTab = 'all' | 'favorites'
type RenderEnvironment = 'exterior' | 'interior'

interface GalleryItem {
    completedAt: string | null
    createdAt: string
    generatedAt: string
    id: string
    isFavorite: boolean
    originalImageUrl: string
    renderedImageUrl: string
    selectedEnvironment: RenderEnvironment | null
    selectedQuality: string | null
    selectedWeather: string | null
}

interface GalleryItemsResponse {
    items: GalleryItem[]
    nextCursor: string | null
}

interface FavoriteResponse {
    id: string
    isFavorite: boolean
}

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector<HTMLElement>('[data-gallery-grid]')

    if (!grid) {
        return
    }

    const root = grid.closest<HTMLElement>('[data-gallery-root]') ?? document.body
    const loader = root.querySelector<HTMLElement>('[data-gallery-loader]')

    if (!loader) {
        return
    }

    const mode = root.dataset.galleryMode === 'recent' ? 'recent' : 'full'
    const pageSize = getGalleryPageSize(root.dataset.galleryLimit, mode === 'recent' ? 4 : 15)

    const elements = {
        afterLabel: document.querySelector<HTMLElement>('[data-gallery-after-label]'),
        beforeLabel: document.querySelector<HTMLElement>('[data-gallery-before-label]'),
        compareHandle: document.querySelector<HTMLElement>('[data-gallery-compare-handle]'),
        compareIcon: document.querySelector<HTMLImageElement>('[data-gallery-compare-icon]'),
        compareRange: document.querySelector<HTMLInputElement>('[data-gallery-compare-range]'),
        compareToggle: document.querySelector<HTMLButtonElement>('[data-gallery-compare-toggle]'),
        confirm: document.querySelector<HTMLElement>('[data-gallery-confirm]'),
        confirmError: document.querySelector<HTMLElement>('[data-gallery-confirm-error]'),
        deleteCancel: document.querySelector<HTMLButtonElement>('[data-gallery-delete-cancel]'),
        deleteConfirm: document.querySelector<HTMLButtonElement>('[data-gallery-delete-confirm]'),
        deleteOpen: document.querySelector<HTMLButtonElement>('[data-gallery-delete-open]'),
        download: document.querySelector<HTMLButtonElement>('[data-gallery-download]'),
        empty: root.querySelector<HTMLElement>('[data-gallery-empty]'),
        emptyCopy: root.querySelector<HTMLElement>('[data-gallery-empty-copy]'),
        error: root.querySelector<HTMLElement>('[data-gallery-error]'),
        fullscreen: document.querySelector<HTMLElement>('[data-gallery-fullscreen]'),
        fullscreenClose: document.querySelector<HTMLButtonElement>('[data-gallery-fullscreen-close]'),
        fullscreenImage: document.querySelector<HTMLImageElement>('[data-gallery-fullscreen-image]'),
        fullscreenOpen: document.querySelector<HTMLButtonElement>('[data-gallery-fullscreen-open]'),
        grid,
        loader,
        modal: document.querySelector<HTMLElement>('[data-gallery-modal]'),
        modalBase: document.querySelector<HTMLImageElement>('[data-gallery-modal-base]'),
        modalClose: document.querySelector<HTMLButtonElement>('[data-gallery-modal-close]'),
        modalDate: document.querySelector<HTMLElement>('[data-gallery-modal-date]'),
        modalError: document.querySelector<HTMLElement>('[data-gallery-modal-error]'),
        modalFavorite: document.querySelector<HTMLButtonElement>('[data-gallery-modal-favorite]'),
        modalFavoriteIcon: document.querySelector<HTMLImageElement>('[data-gallery-modal-favorite-icon]'),
        modalPanel: document.querySelector<HTMLElement>('[data-gallery-modal-panel]'),
        modalQuality: document.querySelector<HTMLElement>('[data-gallery-modal-quality]'),
        modalRendered: document.querySelector<HTMLImageElement>('[data-gallery-modal-rendered]'),
        modalTitle: document.querySelector<HTMLElement>('[data-gallery-modal-title]'),
        modalType: document.querySelector<HTMLElement>('[data-gallery-modal-type]'),
        modalWeather: document.querySelector<HTMLElement>('[data-gallery-modal-weather]'),
        renderedLayer: document.querySelector<HTMLElement>('[data-gallery-rendered-layer]'),
        sentinel: root.querySelector<HTMLElement>('[data-gallery-sentinel]'),
        tabs: Array.from(root.querySelectorAll<HTMLButtonElement>('[data-gallery-tab]')),
        title: root.querySelector<HTMLElement>('[data-gallery-title]')
    }

    const state: {
        compareActive: boolean
        comparePosition: number
        confirmId: string | null
        fullscreenOpen: boolean
        initialized: boolean
        items: Map<string, GalleryItem>
        loading: boolean
        nextCursor: string | null
        order: string[]
        selectedId: string | null
        tab: GalleryTab
    } = {
        compareActive: false,
        comparePosition: 50,
        confirmId: null,
        fullscreenOpen: false,
        initialized: false,
        items: new Map(),
        loading: false,
        nextCursor: null,
        order: [],
        selectedId: null,
        tab: 'all'
    }

    bindEvents()
    observeInfiniteScroll()
    renderTabs()
    void loadItems(true)

    function bindEvents() {
        elements.tabs.forEach((button) => {
            button.addEventListener('click', () => {
                const nextTab = button.dataset.galleryTab === 'favorites' ? 'favorites' : 'all'

                if (nextTab === state.tab) {
                    return
                }

                state.tab = nextTab
                renderTabs()
                void loadItems(true)
            })
        })

        elements.compareToggle?.addEventListener('click', () => {
            const item = getSelectedItem()

            if (!item) {
                return
            }

            state.compareActive = !state.compareActive
            state.comparePosition = 50
            renderModal()
        })

        elements.compareRange?.addEventListener('input', () => {
            state.comparePosition = Number(elements.compareRange?.value ?? 50)
            renderComparison()
        })

        elements.fullscreenOpen?.addEventListener('click', () => {
            if (!getSelectedItem()) {
                return
            }

            state.fullscreenOpen = true
            renderFullscreen()
        })

        elements.fullscreenClose?.addEventListener('click', () => {
            state.fullscreenOpen = false
            renderFullscreen()
        })

        elements.fullscreen?.addEventListener('click', (event) => {
            if (event.target === elements.fullscreen) {
                state.fullscreenOpen = false
                renderFullscreen()
            }
        })

        elements.modalClose?.addEventListener('click', closeModal)
        elements.modal?.addEventListener('click', (event) => {
            if (event.target === elements.modal) {
                closeModal()
            }
        })

        elements.modalFavorite?.addEventListener('click', () => {
            const item = getSelectedItem()

            if (item) {
                void setFavorite(item.id, !item.isFavorite)
            }
        })

        elements.download?.addEventListener('click', () => {
            const item = getSelectedItem()

            if (!item) {
                return
            }

            const link = document.createElement('a')
            link.href = `/member/gallery/${item.id}/download`
            link.download = `gardesa-render-${item.id}.jpg`
            document.body.appendChild(link)
            link.click()
            link.remove()
        })

        elements.deleteOpen?.addEventListener('click', () => {
            const item = getSelectedItem()

            if (!item) {
                return
            }

            state.confirmId = item.id
            renderConfirm()
        })

        elements.deleteCancel?.addEventListener('click', closeConfirm)
        elements.confirm?.addEventListener('click', (event) => {
            if (event.target === elements.confirm) {
                closeConfirm()
            }
        })

        elements.deleteConfirm?.addEventListener('click', () => {
            void deleteSelectedRender()
        })

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Escape') {
                return
            }

            if (state.fullscreenOpen) {
                state.fullscreenOpen = false
                renderFullscreen()
                return
            }

            if (state.confirmId) {
                closeConfirm()
                return
            }

            if (state.selectedId) {
                closeModal()
            }
        })
    }

    function observeInfiniteScroll() {
        if (mode !== 'full' || !elements.sentinel) {
            return
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                void loadItems(false)
            }
        }, {
            rootMargin: '360px 0px'
        })

        observer.observe(elements.sentinel)
    }

    async function loadItems(reset: boolean) {
        if (state.loading || (!reset && !state.nextCursor)) {
            return
        }

        state.loading = true
        clearError()

        if (reset) {
            state.items.clear()
            state.order = []
            state.nextCursor = null
            state.initialized = false
            renderGrid()
        }

        renderLoading()

        try {
            const params = new URLSearchParams({
                limit: String(pageSize),
                tab: state.tab
            })

            if (!reset && state.nextCursor) {
                params.set('cursor', state.nextCursor)
            }

            const response = await fetch(`/member/gallery/items?${params.toString()}`)
            const payload = await parseJsonResponse<GalleryItemsResponse>(response)

            payload.items.forEach((item) => {
                state.items.set(item.id, item)

                if (!state.order.includes(item.id)) {
                    state.order.push(item.id)
                }
            })

            state.nextCursor = payload.nextCursor
            state.initialized = true
            renderGrid()
        } catch (error) {
            showError(getErrorMessage(error))
        } finally {
            state.loading = false
            renderLoading()
        }
    }

    async function setFavorite(id: string, isFavorite: boolean) {
        const item = state.items.get(id)

        if (!item) {
            return
        }

        const previousFavorite = item.isFavorite
        const previousOrder = [...state.order]
        applyFavoriteState(id, isFavorite)

        try {
            const response = await fetch(`/member/gallery/${id}/favorite`, {
                body: JSON.stringify({ isFavorite }),
                headers: {
                    'Content-Type': 'application/json'
                },
                method: 'PATCH'
            })
            const payload = await parseJsonResponse<FavoriteResponse>(response)
            applyFavoriteState(payload.id, payload.isFavorite)
        } catch (error) {
            item.isFavorite = previousFavorite
            state.order = previousOrder
            renderGrid()
            renderModal()
            showContextError(getErrorMessage(error))
        }
    }

    async function deleteSelectedRender() {
        const id = state.confirmId

        if (!id || !elements.deleteConfirm) {
            return
        }

        setDeleteLoading(true)
        clearConfirmError()

        try {
            const response = await fetch(`/member/gallery/${id}`, {
                method: 'DELETE'
            })
            await parseJsonResponse<{ deleted: boolean, id: string }>(response)

            state.items.delete(id)
            state.order = state.order.filter((itemId) => itemId !== id)
            closeConfirm()

            if (state.selectedId === id) {
                closeModal()
            }

            renderGrid()

            if (state.nextCursor && state.order.length < pageSize) {
                void loadItems(false)
            }
        } catch (error) {
            showConfirmError(getErrorMessage(error))
        } finally {
            setDeleteLoading(false)
        }
    }

    async function parseJsonResponse<T>(response: Response): Promise<T> {
        const payload = await response.json().catch(() => null) as { message?: string } | null

        if (!response.ok) {
            throw new Error(payload?.message ?? 'Nao foi possivel concluir a acao.')
        }

        return payload as T
    }

    function getGalleryPageSize(value: string | undefined, fallback: number): number {
        const parsed = Number(value)

        if (!Number.isFinite(parsed)) {
            return fallback
        }

        return Math.max(1, Math.min(30, Math.floor(parsed)))
    }

    function renderTabs() {
        if (!elements.title) {
            return
        }

        elements.title.textContent = state.tab === 'favorites'
            ? 'Galeria - Favoritos'
            : 'Galeria - Todos'

        elements.tabs.forEach((button) => {
            const selected = button.dataset.galleryTab === state.tab
            button.classList.toggle('border-preto', selected)
            button.classList.toggle('bg-preto', selected)
            button.classList.toggle('text-white', selected)
            button.classList.toggle('border-[#d9d9d9]', !selected)
            button.classList.toggle('bg-white', !selected)
            button.classList.toggle('text-preto', !selected)
            button.setAttribute('aria-pressed', String(selected))
        })
    }

    function renderGrid() {
        const visibleOrder = mode === 'recent'
            ? state.order.slice(0, pageSize)
            : state.order
        const cards = visibleOrder
            .map((id) => state.items.get(id))
            .filter((item): item is GalleryItem => Boolean(item))
            .map(createCard)

        elements.grid.replaceChildren(...cards)

        const isEmpty = state.initialized && !state.loading && state.order.length === 0
        elements.empty?.classList.toggle('hidden', !isEmpty)
        elements.empty?.classList.toggle('flex', isEmpty)

        if (elements.emptyCopy) {
            elements.emptyCopy.textContent = mode === 'recent'
                ? 'Quando voce gerar renders, eles aparecerao aqui.'
                : state.tab === 'favorites'
                ? 'Os renders favoritados aparecem aqui.'
                : 'Quando voce gerar renders, eles aparecerao aqui.'
        }
    }

    function createCard(item: GalleryItem): HTMLElement {
        const card = document.createElement('article')
        card.className = 'group relative h-[214px] w-full overflow-hidden rounded-[8px] border border-[#e2e2e2] bg-white transition-colors hover:border-verde focus-within:border-verde'
        card.tabIndex = 0
        card.setAttribute('role', 'button')
        card.setAttribute('aria-label', `Abrir ${getRenderTitle(item)}`)

        const image = document.createElement('img')
        image.src = item.renderedImageUrl
        image.alt = getRenderTitle(item)
        image.className = 'absolute left-2.5 top-2.5 h-[142px] w-[calc(100%-20px)] rounded-[6px] object-cover'
        card.appendChild(image)

        const favoriteButton = document.createElement('button')
        favoriteButton.type = 'button'
        favoriteButton.className = [
            'absolute right-[17px] top-[17px] flex size-[22px] items-center justify-center transition-opacity',
            item.isFavorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
        ].join(' ')
        favoriteButton.setAttribute('aria-label', item.isFavorite ? 'Remover dos favoritos' : 'Favoritar render')
        favoriteButton.addEventListener('click', (event) => {
            event.stopPropagation()
            void setFavorite(item.id, !item.isFavorite)
        })

        const favoriteIcon = document.createElement('img')
        favoriteIcon.src = item.isFavorite ? '/img/icons/star_yellow.svg' : '/img/icons/star.svg'
        favoriteIcon.alt = ''
        favoriteIcon.className = 'size-[22px]'
        favoriteButton.appendChild(favoriteIcon)
        card.appendChild(favoriteButton)

        const titleElement = document.createElement('h3')
        titleElement.className = 'absolute left-3 top-[166px] w-[158px] truncate text-sm font-semibold leading-5 text-preto'
        titleElement.textContent = getRenderTitle(item)
        card.appendChild(titleElement)

        const dateElement = document.createElement('p')
        dateElement.className = 'absolute left-3 top-[188px] text-xs font-normal leading-4 text-preto/50'
        dateElement.textContent = formatRelativeDate(item.generatedAt)
        card.appendChild(dateElement)

        card.addEventListener('click', () => openModal(item.id))
        card.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') {
                return
            }

            event.preventDefault()
            openModal(item.id)
        })

        return card
    }

    function renderLoading() {
        elements.loader.classList.toggle('hidden', !state.loading)
        elements.loader.classList.toggle('flex', state.loading)
    }

    function openModal(id: string) {
        state.selectedId = id
        state.compareActive = false
        state.comparePosition = 50
        clearModalError()
        renderModal()
    }

    function closeModal() {
        state.selectedId = null
        state.compareActive = false
        state.comparePosition = 50
        closeConfirm()
        elements.modal?.classList.add('hidden')
        elements.modal?.classList.remove('flex')
        elements.modal?.setAttribute('aria-hidden', 'true')
        syncBodyOverflow()
    }

    function renderModal() {
        const item = getSelectedItem()
        const showModal = Boolean(item)

        elements.modal?.classList.toggle('hidden', !showModal)
        elements.modal?.classList.toggle('flex', showModal)
        elements.modal?.setAttribute('aria-hidden', String(!showModal))

        if (!item) {
            syncBodyOverflow()
            return
        }

        const title = getRenderTitle(item)
        elements.modalTitle!.textContent = title
        elements.modalType!.textContent = title
        elements.modalDate!.textContent = formatDateTime(item.generatedAt)
        elements.modalWeather!.textContent = getWeatherLabel(item.selectedWeather)
        elements.modalQuality!.textContent = getQualityLabel(item.selectedQuality)
        elements.modalFavoriteIcon!.src = item.isFavorite ? '/img/icons/star_yellow.svg' : '/img/icons/star.svg'
        elements.modalFavorite?.setAttribute('aria-label', item.isFavorite ? 'Remover dos favoritos' : 'Favoritar render')

        if (elements.modalBase) {
            elements.modalBase.src = state.compareActive ? item.originalImageUrl : item.renderedImageUrl
            elements.modalBase.alt = state.compareActive ? 'Imagem original' : title
        }

        if (elements.modalRendered) {
            elements.modalRendered.src = item.renderedImageUrl
        }

        if (elements.compareIcon) {
            elements.compareIcon.src = state.compareActive ? '/img/icons/image.svg' : '/img/icons/move-horizontal.svg'
        }

        elements.renderedLayer?.classList.toggle('hidden', !state.compareActive)
        elements.compareHandle?.classList.toggle('hidden', !state.compareActive)
        elements.compareRange?.classList.toggle('hidden', !state.compareActive)
        elements.beforeLabel?.classList.toggle('hidden', !state.compareActive)
        elements.afterLabel?.classList.toggle('hidden', !state.compareActive)
        elements.compareToggle?.setAttribute('aria-pressed', String(state.compareActive))

        renderComparison()
        syncBodyOverflow()
    }

    function renderComparison() {
        const position = Math.max(0, Math.min(100, state.comparePosition))
        elements.renderedLayer?.style.setProperty('clip-path', `inset(0 0 0 ${position}%)`)
        elements.compareHandle?.style.setProperty('left', `${position}%`)

        if (elements.compareRange) {
            elements.compareRange.value = String(position)
        }
    }

    function renderFullscreen() {
        const item = getSelectedItem()
        const showFullscreen = Boolean(state.fullscreenOpen && item)

        elements.fullscreen?.classList.toggle('hidden', !showFullscreen)
        elements.fullscreen?.classList.toggle('flex', showFullscreen)
        elements.fullscreen?.setAttribute('aria-hidden', String(!showFullscreen))

        if (showFullscreen && item && elements.fullscreenImage) {
            elements.fullscreenImage.src = item.renderedImageUrl
        }

        syncBodyOverflow()
    }

    function renderConfirm() {
        const showConfirm = Boolean(state.confirmId)
        elements.confirm?.classList.toggle('hidden', !showConfirm)
        elements.confirm?.classList.toggle('flex', showConfirm)
        elements.confirm?.setAttribute('aria-hidden', String(!showConfirm))
        clearConfirmError()
        syncBodyOverflow()
    }

    function closeConfirm() {
        state.confirmId = null
        elements.confirm?.classList.add('hidden')
        elements.confirm?.classList.remove('flex')
        elements.confirm?.setAttribute('aria-hidden', 'true')
        clearConfirmError()
        syncBodyOverflow()
    }

    function applyFavoriteState(id: string, isFavorite: boolean) {
        const item = state.items.get(id)

        if (!item) {
            return
        }

        item.isFavorite = isFavorite

        if (state.tab === 'favorites' && !isFavorite) {
            state.order = state.order.filter((itemId) => itemId !== id)
        }

        renderGrid()
        renderModal()
    }

    function getSelectedItem(): GalleryItem | null {
        if (!state.selectedId) {
            return null
        }

        return state.items.get(state.selectedId) ?? null
    }

    function getRenderTitle(item: GalleryItem): string {
        return item.selectedEnvironment === 'interior' ? 'Render interno' : 'Render externo'
    }

    function getWeatherLabel(value: string | null): string {
        const labels = new Map([
            ['dia', 'Dia'],
            ['noite', 'Noite'],
            ['chuvoso', 'Chuvoso'],
            ['por-do-sol', 'Por do sol']
        ])

        return labels.get(value ?? '') ?? '--'
    }

    function getQualityLabel(value: string | null): string {
        if (value === '1K') {
            return 'HD · 1K'
        }

        if (value === '2K') {
            return 'Full HD · 2K'
        }

        if (value === '4K') {
            return '4K'
        }

        return '--'
    }

    function formatRelativeDate(value: string): string {
        const date = new Date(value)

        if (Number.isNaN(date.getTime())) {
            return ''
        }

        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
        const days = Math.max(0, Math.floor((today - target) / 86_400_000))

        if (days === 0) {
            return 'Hoje'
        }

        if (days === 1) {
            return 'Ontem'
        }

        if (days < 7) {
            return `${days}d atrás`
        }

        if (days < 30) {
            const weeks = Math.max(1, Math.floor(days / 7))
            return weeks === 1 ? '1 sem atrás' : `${weeks} sem atrás`
        }

        if (days < 365) {
            const months = Math.max(1, Math.floor(days / 30))
            return months === 1 ? '1 mês atrás' : `${months} meses atrás`
        }

        const years = Math.max(1, Math.floor(days / 365))
        return years === 1 ? '1 ano atrás' : `${years} anos atrás`
    }

    function formatDateTime(value: string): string {
        const date = new Date(value)

        if (Number.isNaN(date.getTime())) {
            return '--'
        }

        return `${date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        })} - ${date.toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        })}`
    }

    function showError(message: string) {
        if (!elements.error) {
            return
        }

        elements.error.textContent = message
        elements.error.classList.remove('hidden')
    }

    function clearError() {
        if (!elements.error) {
            return
        }

        elements.error.textContent = ''
        elements.error.classList.add('hidden')
    }

    function showModalError(message: string) {
        if (!elements.modalError) {
            return
        }

        elements.modalError.textContent = message
        elements.modalError.classList.remove('hidden')
    }

    function clearModalError() {
        if (!elements.modalError) {
            return
        }

        elements.modalError.textContent = ''
        elements.modalError.classList.add('hidden')
    }

    function showConfirmError(message: string) {
        if (!elements.confirmError) {
            return
        }

        elements.confirmError.textContent = message
        elements.confirmError.classList.remove('hidden')
    }

    function clearConfirmError() {
        if (!elements.confirmError) {
            return
        }

        elements.confirmError.textContent = ''
        elements.confirmError.classList.add('hidden')
    }

    function showContextError(message: string) {
        if (state.selectedId) {
            showModalError(message)
            return
        }

        showError(message)
    }

    function setDeleteLoading(value: boolean) {
        if (!elements.deleteConfirm) {
            return
        }

        elements.deleteConfirm.disabled = value
        elements.deleteConfirm.classList.toggle('opacity-70', value)
        elements.deleteConfirm.classList.toggle('cursor-not-allowed', value)
        elements.deleteConfirm.textContent = value ? 'Excluindo...' : 'Confirmar'
    }

    function getErrorMessage(error: unknown): string {
        if (error instanceof Error && error.message) {
            return error.message
        }

        return 'Nao foi possivel concluir a acao.'
    }

    function syncBodyOverflow() {
        document.body.classList.toggle('overflow-hidden', Boolean(state.selectedId || state.confirmId || state.fullscreenOpen))
    }
})
