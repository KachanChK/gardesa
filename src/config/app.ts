const defaultPort = process.env.PORT ?? '3000'

function normalizeUrl(url?: string): string {
  if (!url) {
    return `http://localhost:${defaultPort}`
  }

  return url.replace(/\/+$/, '')
}

export const port = Number.parseInt(defaultPort, 10) || 3000
export const isProduction = process.env.NODE_ENV === 'production'
export const appUrl = normalizeUrl(process.env.APP_URL)
