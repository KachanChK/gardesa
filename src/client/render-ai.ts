import { put } from '@vercel/blob/client'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg'])
const ASPECT_RATIOS = new Set(['match_input_image', '1:1', '3:4', '16:9', '9:16'])
const QUALITY_BY_SLIDER_VALUE = new Map([
    ['1', '1K'],
    ['2', '2K'],
    ['3', '4K']
])
const CREDIT_COST_BY_QUALITY = new Map([
    ['1K', 2],
    ['2K', 3],
    ['4K', 5]
])

class RenderRequestError extends Error {
    readonly upgradeUrl: string | null

    constructor(message: string, upgradeUrl: string | null) {
        super(message)
        this.name = 'RenderRequestError'
        this.upgradeUrl = upgradeUrl
    }
}

type RenderViewMode = 'compare' | 'rendered'
type RenderAspectRatio = 'match_input_image' | '1:1' | '3:4' | '16:9' | '9:16'

interface UploadIntentResponse {
    renderId: string
    upload: {
        contentType: 'image/png' | 'image/jpeg'
        pathname: string
        token: string
    }
}

interface GenerateResponse {
    balance?: number
    id: string
    originalImageUrl: string
    renderedImageUrl: string
    status: 'completed'
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        actionMenu: document.querySelector<HTMLElement>('[data-render-actions]'),
        aspectRatioSelect: document.querySelector<HTMLSelectElement>('[data-render-aspect-ratio]'),
        compareHandle: document.querySelector<HTMLElement>('[data-render-compare-handle]'),
        compareRange: document.querySelector<HTMLInputElement>('[data-render-compare-range]'),
        costBadge: document.querySelector<HTMLElement>('[data-render-cost]'),
        creditBalance: document.querySelector<HTMLElement>('[data-credit-balance]'),
        downloadButton: document.querySelector<HTMLButtonElement>('[data-render-download]'),
        emptyState: document.querySelector<HTMLElement>('[data-render-empty-state]'),
        environmentButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-environment-option]')),
        error: document.querySelector<HTMLElement>('[data-render-error]'),
        fileInput: document.querySelector<HTMLInputElement>('[data-render-file-input]'),
        fullscreenClose: document.querySelector<HTMLButtonElement>('[data-render-fullscreen-close]'),
        fullscreenImage: document.querySelector<HTMLImageElement>('[data-render-fullscreen-image]'),
        fullscreenOverlay: document.querySelector<HTMLElement>('[data-render-fullscreen-overlay]'),
        fullscreenToggle: document.querySelector<HTMLButtonElement>('[data-render-fullscreen-toggle]'),
        generateButton: document.querySelector<HTMLButtonElement>('[data-render-generate]'),
        loading: document.querySelector<HTMLElement>('[data-render-loading]'),
        loadingStatus: document.querySelector<HTMLElement>('[data-render-loading-status]'),
        measureImage: document.querySelector<HTMLImageElement>('[data-render-measure-image]'),
        originalImage: document.querySelector<HTMLImageElement>('[data-original-image]'),
        preview: document.querySelector<HTMLElement>('[data-render-preview]'),
        progress: document.querySelector<HTMLElement>('[data-render-progress]'),
        qualityActive: document.querySelector<HTMLElement>('[data-quality-active]'),
        qualityLabels: Array.from(document.querySelectorAll<HTMLElement>('[data-quality-label]')),
        qualityRange: document.querySelector<HTMLInputElement>('[data-quality-range]'),
        removeImageButton: document.querySelector<HTMLButtonElement>('[data-render-remove-image]'),
        renderedImage: document.querySelector<HTMLImageElement>('[data-rendered-image]'),
        renderedLayer: document.querySelector<HTMLElement>('[data-rendered-layer]'),
        status: document.querySelector<HTMLElement>('[data-render-status]'),
        uploadEmpty: document.querySelector<HTMLElement>('[data-render-upload-empty]'),
        uploadPreview: document.querySelector<HTMLImageElement>('[data-render-upload-preview]'),
        uploadZone: document.querySelector<HTMLElement>('[data-render-upload-zone]'),
        viewToggle: document.querySelector<HTMLButtonElement>('[data-render-view-toggle]'),
        viewToggleIcon: document.querySelector<HTMLImageElement>('[data-render-view-toggle-icon]'),
        weatherButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weather-option]'))
    }

    if (!elements.aspectRatioSelect || !elements.fileInput || !elements.generateButton || !elements.preview || !elements.emptyState || !elements.loading || !elements.loadingStatus || !elements.measureImage || !elements.originalImage || !elements.renderedImage || !elements.renderedLayer || !elements.uploadZone) {
        return
    }

    const state: {
        comparePosition: number
        environment: string | null
        file: File | null
        fullscreen: boolean
        isLoading: boolean
        loadingMessage: string
        originalPreviewUrl: string | null
        renderedUrl: string | null
        renderId: string | null
        viewMode: RenderViewMode
        weather: string | null
    } = {
        comparePosition: 50,
        environment: null,
        file: null,
        fullscreen: false,
        isLoading: false,
        loadingMessage: '',
        originalPreviewUrl: null,
        renderedUrl: null,
        renderId: null,
        viewMode: 'compare',
        weather: null
    }

    bindEvents()
    renderEnvironmentState()
    renderWeatherState()
    renderQualityState()
    renderUi()

    function bindEvents() {
        elements.uploadZone?.addEventListener('click', (event) => {
            if (event.target instanceof HTMLElement && event.target.closest('[data-render-remove-image]')) {
                return
            }

            elements.fileInput?.click()
        })

        elements.uploadZone?.addEventListener('keydown', (event) => {
            if (event.target instanceof HTMLElement && event.target.closest('[data-render-remove-image]')) {
                return
            }

            if (event.key !== 'Enter' && event.key !== ' ') {
                return
            }

            event.preventDefault()
            elements.fileInput?.click()
        })

        elements.fileInput?.addEventListener('change', () => {
            const file = elements.fileInput?.files?.[0] ?? null
            setSelectedFile(file)
        })

        elements.removeImageButton?.addEventListener('click', (event) => {
            event.stopPropagation()
            removeSelectedFile()
        })

        elements.environmentButtons.forEach((button) => {
            button.addEventListener('click', () => {
                state.environment = button.dataset.environmentOption ?? null
                clearError()
                renderEnvironmentState()
            })
        })

        elements.weatherButtons.forEach((button) => {
            button.addEventListener('click', () => {
                state.weather = button.dataset.weatherOption ?? null
                clearError()
                renderWeatherState()
            })
        })

        elements.qualityRange?.addEventListener('input', () => {
            clearError()
            renderQualityState()
        })

        elements.aspectRatioSelect?.addEventListener('change', () => {
            clearError()
        })

        elements.generateButton?.addEventListener('click', () => {
            void generateRender()
        })

        elements.compareRange?.addEventListener('input', () => {
            state.comparePosition = Number(elements.compareRange?.value ?? 50)
            renderComparisonPosition()
        })

        elements.viewToggle?.addEventListener('click', () => {
            if (!state.renderedUrl || !state.originalPreviewUrl) {
                return
            }

            state.viewMode = state.viewMode === 'compare' ? 'rendered' : 'compare'
            renderUi()
        })

        elements.downloadButton?.addEventListener('click', () => {
            downloadRenderedImage()
        })

        elements.fullscreenToggle?.addEventListener('click', () => {
            setFullscreen(true)
        })

        elements.fullscreenClose?.addEventListener('click', () => {
            setFullscreen(false)
        })

        elements.fullscreenOverlay?.addEventListener('click', (event) => {
            if (event.target === elements.fullscreenOverlay) {
                setFullscreen(false)
            }
        })

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && state.fullscreen) {
                setFullscreen(false)
            }
        })
    }

    function setSelectedFile(file: File | null) {
        clearError()
        setStatus('')

        if (!file) {
            return
        }

        const validationMessage = validateFile(file)

        if (validationMessage) {
            showError(validationMessage)
            elements.fileInput!.value = ''
            return
        }

        if (state.originalPreviewUrl) {
            URL.revokeObjectURL(state.originalPreviewUrl)
        }

        state.file = file
        state.originalPreviewUrl = URL.createObjectURL(file)
        state.renderedUrl = null
        state.renderId = null
        state.viewMode = 'compare'
        state.comparePosition = 50
        state.fullscreen = false

        renderUi()
    }

    function removeSelectedFile() {
        clearError()
        setStatus('')
        setProgress('')

        if (state.originalPreviewUrl) {
            URL.revokeObjectURL(state.originalPreviewUrl)
        }

        const hasRendered = Boolean(state.renderedUrl)

        state.file = null
        state.originalPreviewUrl = null
        state.renderedUrl = hasRendered ? state.renderedUrl : null
        state.renderId = hasRendered ? state.renderId : null
        state.viewMode = hasRendered ? 'rendered' : 'compare'
        state.comparePosition = 50
        state.fullscreen = false
        elements.fileInput!.value = ''

        renderUi()
    }

    async function generateRender() {
        clearError()

        if (!state.file) {
            showError('Envie uma imagem PNG ou JPG antes de gerar o render.')
            return
        }

        if (!state.environment) {
            showError('Selecione o tipo de ambiente do render.')
            return
        }

        if (!state.weather) {
            showError('Selecione o clima do render.')
            return
        }

        const quality = getSelectedQuality()

        if (!quality) {
            showError('Selecione a qualidade do render.')
            return
        }

        const aspectRatio = getSelectedAspectRatio()

        if (!aspectRatio) {
            showError('Selecione o formato do render.')
            return
        }

        try {
            setLoading(true)
            setStatus('Enviando imagem...')

            const intent = await createUploadIntent(state.file)
            state.renderId = intent.renderId

            let isUploading = true

            await put(intent.upload.pathname, state.file, {
                access: 'private',
                contentType: intent.upload.contentType,
                onUploadProgress: (progress) => {
                    if (!isUploading) {
                        return
                    }

                    const percentage = Math.max(0, Math.min(100, Math.round(progress.percentage)))
                    setProgress(`${percentage}%`)
                    setStatus(`Enviando imagem... ${percentage}%`)
                },
                token: intent.upload.token
            })

            isUploading = false
            setProgress('')
            setStatus('Gerando render...')

            const rendered = await requestRenderGeneration(intent.renderId, state.environment, state.weather, quality, aspectRatio)

            updateCreditBalance(rendered.balance)
            state.renderedUrl = withCacheBust(rendered.renderedImageUrl)
            state.viewMode = 'compare'
            state.comparePosition = 50
            state.fullscreen = false

            renderUi()
        } catch (error) {
            if (error instanceof RenderRequestError && error.upgradeUrl) {
                showUpgradeError(error.message, error.upgradeUrl)
            } else {
                showError(getErrorMessage(error))
            }

            setStatus('')
        } finally {
            setLoading(false)
            setStatus('')
            setProgress('')
        }
    }

    async function createUploadIntent(file: File): Promise<UploadIntentResponse> {
        const response = await fetch('/member/render/upload-intent', {
            body: JSON.stringify({
                contentType: file.type,
                name: file.name,
                size: file.size
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        })

        return parseJsonResponse<UploadIntentResponse>(response)
    }

    async function requestRenderGeneration(renderId: string, environment: string, weather: string, quality: string, aspectRatio: RenderAspectRatio): Promise<GenerateResponse> {
        const response = await fetch('/member/render/generate', {
            body: JSON.stringify({
                aspectRatio,
                environment,
                quality,
                renderId,
                weather
            }),
            headers: {
                'Content-Type': 'application/json'
            },
            method: 'POST'
        })

        return parseJsonResponse<GenerateResponse>(response)
    }

    async function parseJsonResponse<T>(response: Response): Promise<T> {
        const payload = await response.json().catch(() => null) as { message?: string, upgradeUrl?: string } | null

        if (!response.ok) {
            const message = payload?.message ?? 'Nao foi possivel concluir a acao.'
            throw new RenderRequestError(message, payload?.upgradeUrl ?? null)
        }

        return payload as T
    }

    function renderUi() {
        const hasOriginal = Boolean(state.originalPreviewUrl)
        const hasRendered = Boolean(state.renderedUrl)
        const isLoading = state.isLoading

        if (!hasOriginal && state.viewMode === 'compare') {
            state.viewMode = 'rendered'
        }

        const showComparison = !isLoading && hasOriginal && hasRendered && state.viewMode === 'compare'

        elements.emptyState?.classList.toggle('hidden', isLoading || hasRendered)
        elements.loading?.classList.toggle('hidden', !isLoading)
        elements.loading?.classList.toggle('flex', isLoading)
        elements.loading?.setAttribute('aria-busy', String(isLoading))
        elements.preview?.classList.toggle('hidden', isLoading || !hasRendered)
        elements.preview?.classList.toggle('flex', !isLoading && hasRendered)
        elements.actionMenu?.classList.toggle('hidden', isLoading || !hasRendered)
        elements.actionMenu?.classList.toggle('flex', !isLoading && hasRendered)

        if (elements.loadingStatus) {
            elements.loadingStatus.textContent = state.loadingMessage || 'Preparando render...'
        }

        elements.uploadEmpty?.classList.toggle('hidden', hasOriginal)
        elements.uploadPreview?.classList.toggle('hidden', !hasOriginal)
        elements.removeImageButton?.classList.toggle('hidden', !hasOriginal)
        elements.removeImageButton?.classList.toggle('flex', hasOriginal)

        if (state.originalPreviewUrl && elements.uploadPreview) {
            elements.uploadPreview.src = state.originalPreviewUrl
        } else {
            elements.uploadPreview?.removeAttribute('src')
        }

        if (state.renderedUrl) {
            elements.measureImage!.src = state.renderedUrl
            elements.originalImage!.src = showComparison
                ? state.originalPreviewUrl!
                : state.renderedUrl
            elements.renderedImage!.src = state.renderedUrl
        } else {
            elements.measureImage!.removeAttribute('src')
            elements.originalImage!.removeAttribute('src')
            elements.renderedImage!.removeAttribute('src')
        }

        elements.renderedLayer!.classList.toggle('hidden', !showComparison)
        elements.compareHandle?.classList.toggle('hidden', !showComparison)
        elements.compareRange?.classList.toggle('hidden', !showComparison)
        elements.viewToggle?.classList.toggle('hidden', isLoading || !hasOriginal)
        elements.viewToggle?.toggleAttribute('disabled', isLoading || !hasOriginal)

        if (elements.viewToggleIcon) {
            elements.viewToggleIcon.src = state.viewMode === 'compare'
                ? '/img/icons/image.svg'
                : '/img/icons/move-horizontal.svg'
        }

        elements.viewToggle?.setAttribute(
            'aria-label',
            state.viewMode === 'compare' ? 'Visualizar render' : 'Comparar resultado'
        )

        renderComparisonPosition()
        renderFullscreen()
    }

    function renderComparisonPosition() {
        const position = Math.max(0, Math.min(100, state.comparePosition))
        elements.renderedLayer?.style.setProperty('clip-path', `inset(0 ${100 - position}% 0 0)`)
        elements.compareHandle?.style.setProperty('left', `${position}%`)

        if (elements.compareRange) {
            elements.compareRange.value = String(position)
        }
    }

    function renderFullscreen() {
        const showFullscreen = Boolean(state.fullscreen && state.renderedUrl)

        elements.fullscreenOverlay?.classList.toggle('hidden', !showFullscreen)
        elements.fullscreenOverlay?.classList.toggle('flex', showFullscreen)
        elements.fullscreenOverlay?.setAttribute('aria-hidden', String(!showFullscreen))
        document.body.classList.toggle('overflow-hidden', showFullscreen)

        if (showFullscreen && state.renderedUrl && elements.fullscreenImage) {
            elements.fullscreenImage.src = state.renderedUrl
        }
    }

    function renderEnvironmentState() {
        elements.environmentButtons.forEach((button) => {
            const selected = button.dataset.environmentOption === state.environment
            button.classList.toggle('border-verde', selected)
            button.classList.toggle('bg-[#f2f8ef]', selected)
            button.classList.toggle('border-[#e2e2e2]', !selected)
            button.classList.toggle('bg-white', !selected)
            button.setAttribute('aria-pressed', String(selected))
        })
    }

    function renderWeatherState() {
        elements.weatherButtons.forEach((button) => {
            const selected = button.dataset.weatherOption === state.weather
            button.classList.toggle('border-verde', selected)
            button.classList.toggle('bg-[#f2f8ef]', selected)
            button.classList.toggle('border-[#e2e2e2]', !selected)
            button.classList.toggle('bg-white', !selected)
            button.setAttribute('aria-pressed', String(selected))
        })
    }

    function renderQualityState() {
        const quality = getSelectedQuality()
        const sliderValue = Number(elements.qualityRange?.value ?? 2)
        const activeWidth = `${Math.max(0, Math.min(100, ((sliderValue - 1) / 2) * 100))}%`

        elements.qualityActive?.style.setProperty('width', activeWidth)

        elements.qualityLabels.forEach((label) => {
            const selected = label.dataset.qualityLabel === quality
            label.classList.toggle('text-preto', selected)
            label.classList.toggle('text-preto/55', !selected)
        })

        if (elements.costBadge && quality) {
            elements.costBadge.textContent = String(CREDIT_COST_BY_QUALITY.get(quality) ?? '')
        }
    }

    function updateCreditBalance(balance: number | undefined) {
        if (typeof balance === 'number' && elements.creditBalance) {
            elements.creditBalance.textContent = String(balance)
        }
    }

    function setFullscreen(value: boolean) {
        if (!state.renderedUrl) {
            return
        }

        state.fullscreen = value
        renderFullscreen()
    }

    function downloadRenderedImage() {
        if (!state.renderedUrl) {
            return
        }

        const link = document.createElement('a')
        link.href = state.renderedUrl
        link.download = `gardesa-render-${state.renderId ?? Date.now()}.png`
        document.body.appendChild(link)
        link.click()
        link.remove()
    }

    function getSelectedQuality(): string | null {
        return QUALITY_BY_SLIDER_VALUE.get(elements.qualityRange?.value ?? '2') ?? null
    }

    function getSelectedAspectRatio(): RenderAspectRatio | null {
        const value = elements.aspectRatioSelect?.value ?? 'match_input_image'

        if (isRenderAspectRatio(value)) {
            return value
        }

        return null
    }

    function isRenderAspectRatio(value: string): value is RenderAspectRatio {
        return ASPECT_RATIOS.has(value)
    }

    function validateFile(file: File): string | null {
        if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
            return 'Envie apenas imagens PNG ou JPG.'
        }

        if (file.size > MAX_UPLOAD_BYTES) {
            return 'A imagem deve ter ate 5 MB.'
        }

        return null
    }

    function setLoading(value: boolean) {
        state.isLoading = value

        if (!value) {
            state.loadingMessage = ''
        }

        elements.generateButton!.disabled = value
        elements.generateButton!.classList.toggle('opacity-70', value)
        elements.generateButton!.classList.toggle('cursor-not-allowed', value)
        elements.generateButton!.querySelector('[data-render-button-label]')!.textContent = value
            ? 'Gerando render...'
            : 'Gerar render'

        renderUi()
    }

    function setStatus(message: string) {
        state.loadingMessage = message

        if (elements.loadingStatus && state.isLoading) {
            elements.loadingStatus.textContent = message || 'Preparando render...'
        }

        if (elements.status) {
            elements.status.textContent = message
        }
    }

    function setProgress(message: string) {
        if (!elements.progress) {
            return
        }

        elements.progress.textContent = message
    }

    function showError(message: string) {
        if (!elements.error) {
            return
        }

        elements.error.textContent = message
        elements.error.classList.remove('hidden')
    }

    function showUpgradeError(message: string, upgradeUrl: string) {
        if (!elements.error) {
            return
        }

        elements.error.textContent = `${message} `
        const link = document.createElement('a')
        link.href = upgradeUrl
        link.textContent = 'Ver planos'
        link.className = 'font-semibold underline'
        elements.error.appendChild(link)
        elements.error.classList.remove('hidden')
    }

    function clearError() {
        if (!elements.error) {
            return
        }

        elements.error.textContent = ''
        elements.error.classList.add('hidden')
    }

    function getErrorMessage(error: unknown): string {
        if (error instanceof Error && error.message) {
            return error.message
        }

        return 'Nao foi possivel gerar o render. Tente novamente.'
    }

    function withCacheBust(url: string): string {
        const separator = url.includes('?') ? '&' : '?'
        return `${url}${separator}t=${Date.now()}`
    }
})
