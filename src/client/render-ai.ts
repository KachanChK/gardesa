import { put } from '@vercel/blob/client'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_CONTENT_TYPES = new Set(['image/png', 'image/jpeg'])
const QUALITY_BY_SLIDER_VALUE = new Map([
    ['1', '1K'],
    ['2', '2K'],
    ['3', '4K']
])

interface UploadIntentResponse {
    renderId: string
    upload: {
        contentType: 'image/png' | 'image/jpeg'
        pathname: string
        token: string
    }
}

interface GenerateResponse {
    id: string
    originalImageUrl: string
    renderedImageUrl: string
    status: 'completed'
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        compareCheckbox: document.querySelector<HTMLInputElement>('[data-render-compare-checkbox]'),
        compareControls: document.querySelector<HTMLElement>('[data-render-compare-controls]'),
        compareHandle: document.querySelector<HTMLElement>('[data-render-compare-handle]'),
        compareRange: document.querySelector<HTMLInputElement>('[data-render-compare-range]'),
        emptyState: document.querySelector<HTMLElement>('[data-render-empty-state]'),
        environmentButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-environment-option]')),
        error: document.querySelector<HTMLElement>('[data-render-error]'),
        fileInput: document.querySelector<HTMLInputElement>('[data-render-file-input]'),
        generateButton: document.querySelector<HTMLButtonElement>('[data-render-generate]'),
        qualityActive: document.querySelector<HTMLElement>('[data-quality-active]'),
        preview: document.querySelector<HTMLElement>('[data-render-preview]'),
        previewFrame: document.querySelector<HTMLElement>('[data-render-preview-frame]'),
        progress: document.querySelector<HTMLElement>('[data-render-progress]'),
        qualityLabels: Array.from(document.querySelectorAll<HTMLElement>('[data-quality-label]')),
        qualityRange: document.querySelector<HTMLInputElement>('[data-quality-range]'),
        renderedImage: document.querySelector<HTMLImageElement>('[data-rendered-image]'),
        renderedLayer: document.querySelector<HTMLElement>('[data-rendered-layer]'),
        status: document.querySelector<HTMLElement>('[data-render-status]'),
        uploadButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-render-upload-button]')),
        originalImage: document.querySelector<HTMLImageElement>('[data-original-image]'),
        weatherButtons: Array.from(document.querySelectorAll<HTMLButtonElement>('[data-weather-option]'))
    }

    if (!elements.fileInput || !elements.generateButton || !elements.preview || !elements.emptyState || !elements.originalImage || !elements.renderedImage || !elements.renderedLayer) {
        return
    }

    const state: {
        compareEnabled: boolean
        comparePosition: number
        environment: string | null
        file: File | null
        originalPreviewUrl: string | null
        renderedUrl: string | null
        renderId: string | null
        weather: string | null
    } = {
        compareEnabled: true,
        comparePosition: 50,
        environment: null,
        file: null,
        originalPreviewUrl: null,
        renderedUrl: null,
        renderId: null,
        weather: null
    }

    bindEvents()
    renderQualityState()
    renderPreview()

    function bindEvents() {
        elements.uploadButtons.forEach((button) => {
            button.addEventListener('click', () => elements.fileInput?.click())
        })

        elements.fileInput?.addEventListener('change', () => {
            const file = elements.fileInput?.files?.[0] ?? null
            setSelectedFile(file)
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

        elements.generateButton?.addEventListener('click', () => {
            void generateRender()
        })

        elements.compareCheckbox?.addEventListener('change', () => {
            state.compareEnabled = Boolean(elements.compareCheckbox?.checked)
            renderPreview()
        })

        elements.compareRange?.addEventListener('input', () => {
            state.comparePosition = Number(elements.compareRange?.value ?? 50)
            renderComparisonPosition()
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
        state.compareEnabled = true
        state.comparePosition = 50

        if (elements.compareCheckbox) {
            elements.compareCheckbox.checked = true
        }

        renderPreview()
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

        try {
            setLoading(true)
            setStatus('Enviando imagem...')

            const intent = await createUploadIntent(state.file)
            state.renderId = intent.renderId

            await put(intent.upload.pathname, state.file, {
                access: 'private',
                contentType: intent.upload.contentType,
                onUploadProgress: (progress) => {
                    const percentage = Math.max(0, Math.min(100, Math.round(progress.percentage)))
                    setProgress(`${percentage}%`)
                    setStatus(`Enviando imagem... ${percentage}%`)
                },
                token: intent.upload.token
            })

            setProgress('')
            setStatus('Gerando render...')

            const rendered = await requestRenderGeneration(intent.renderId, state.environment, state.weather, quality)

            state.renderedUrl = withCacheBust(rendered.renderedImageUrl)
            state.compareEnabled = true
            state.comparePosition = 50

            if (elements.compareCheckbox) {
                elements.compareCheckbox.checked = true
            }

            renderPreview()
            setStatus('Render finalizado.')
        } catch (error) {
            showError(getErrorMessage(error))
            setStatus('')
        } finally {
            setLoading(false)
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

    async function requestRenderGeneration(renderId: string, environment: string, weather: string, quality: string): Promise<GenerateResponse> {
        const response = await fetch('/member/render/generate', {
            body: JSON.stringify({
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
        const payload = await response.json().catch(() => null) as { message?: string } | null

        if (!response.ok) {
            throw new Error(payload?.message ?? 'Nao foi possivel concluir a acao.')
        }

        return payload as T
    }

    function renderPreview() {
        const hasOriginal = Boolean(state.originalPreviewUrl)
        const hasRendered = Boolean(state.renderedUrl)

        elements.emptyState?.classList.toggle('hidden', hasOriginal)
        elements.preview?.classList.toggle('hidden', !hasOriginal)
        elements.preview?.classList.toggle('flex', hasOriginal)
        elements.compareControls?.classList.toggle('hidden', !hasRendered)

        if (!state.originalPreviewUrl) {
            return
        }

        const showComparison = hasRendered && state.compareEnabled
        elements.originalImage!.src = showComparison ? state.originalPreviewUrl : state.renderedUrl ?? state.originalPreviewUrl
        elements.renderedImage!.src = state.renderedUrl ?? ''
        elements.renderedLayer!.classList.toggle('hidden', !showComparison)
        elements.compareHandle?.classList.toggle('hidden', !showComparison)
        elements.compareRange?.classList.toggle('hidden', !showComparison)

        renderComparisonPosition()
    }

    function renderComparisonPosition() {
        const position = Math.max(0, Math.min(100, state.comparePosition))
        elements.renderedLayer?.style.setProperty('clip-path', `inset(0 ${100 - position}% 0 0)`)
        elements.compareHandle?.style.setProperty('left', `${position}%`)

        if (elements.compareRange) {
            elements.compareRange.value = String(position)
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
    }

    function getSelectedQuality(): string | null {
        return QUALITY_BY_SLIDER_VALUE.get(elements.qualityRange?.value ?? '2') ?? null
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
        elements.generateButton!.disabled = value
        elements.generateButton!.classList.toggle('opacity-70', value)
        elements.generateButton!.classList.toggle('cursor-not-allowed', value)
        elements.generateButton!.querySelector('[data-render-button-label]')!.textContent = value
            ? 'Gerando render...'
            : 'Gerar render'
    }

    function setStatus(message: string) {
        if (!elements.status) {
            return
        }

        elements.status.textContent = message
        elements.status.classList.toggle('hidden', !message)
    }

    function setProgress(message: string) {
        if (!elements.progress) {
            return
        }

        elements.progress.textContent = message
        elements.progress.classList.toggle('hidden', !message)
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
