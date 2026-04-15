import type { User } from '@supabase/supabase-js'
import type { Request, Response } from 'express'
import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import { isProduction } from '../config/app'
import {
  hasSupabasePublicCredentials,
  supabase,
  supabasePublicKey,
  supabaseUrl
} from '../config/supabase'
import { noStore, redirectIfAuthenticated, requireAuth } from '../middlewares/auth'
import { authRateLimit } from '../middlewares/rateLimit'
import { clearSessionCookies, readSessionTokens, setSessionCookies } from '../utils/auth'
import {
  getFieldErrors,
  getSafeRedirectPath,
  loginSchema,
  registerSchema,
  sessionSyncSchema
} from '../utils/validation'

const router = Router()
const OAUTH_STORAGE_KEY = 'gardesa-google-oauth'
const OAUTH_KEYS_COOKIE = 'gardesa-oauth-keys'
const OAUTH_REDIRECT_COOKIE = 'gardesa-oauth-redirect'

type FieldErrors = Record<string, string[] | undefined>

function getStatusMessage(status: unknown) {
  switch (status) {
    case 'signed-out':
      return 'Sua sessao foi encerrada com seguranca.'
    case 'rate-limited':
      return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.'
    case 'account-created':
      return 'Sua conta foi criada. Faca login para continuar.'
    case 'session-expired':
      return 'Sua sessao expirou ou foi revogada. Entre novamente para continuar.'
    case 'google-failed':
      return 'Nao foi possivel concluir a autenticacao com Google.'
    default:
      return undefined
  }
}

function getAuthViewModel(
  req: Request,
  overrides?: {
    authError?: string
    fieldErrors?: FieldErrors
    statusMessage?: string
    values?: Record<string, string | undefined>
  }
) {
  return {
    authError: overrides?.authError,
    fieldErrors: overrides?.fieldErrors ?? {},
    nextPath: getSafeRedirectPath(req.query.next ?? req.body?.next),
    statusMessage: overrides?.statusMessage ?? getStatusMessage(req.query.status),
    supabasePublicEnabled: hasSupabasePublicCredentials(),
    supabasePublicKey: supabasePublicKey ?? '',
    supabaseUrl,
    values: overrides?.values ?? {}
  }
}

function renderLogin(
  req: Request,
  res: Response,
  overrides?: {
    authError?: string
    fieldErrors?: FieldErrors
    statusMessage?: string
    values?: { email?: string; password?: string }
  }
) {
  res.render('auth-login', getAuthViewModel(req, overrides))
}

function renderRegister(
  req: Request,
  res: Response,
  overrides?: {
    authError?: string
    fieldErrors?: FieldErrors
    statusMessage?: string
    values?: { confirmPassword?: string; email?: string; name?: string; password?: string }
  }
) {
  res.render('auth-register', getAuthViewModel(req, overrides))
}

function getUserDisplayName(user: User | null | undefined) {
  const metadataName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
        ? user.user_metadata.name
        : ''

  if (metadataName.trim()) {
    return metadataName.trim()
  }

  return user?.email?.split('@')[0] ?? 'Paisagista'
}

function getOAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 1000 * 60 * 15,
    path: '/',
    sameSite: 'lax' as const,
    secure: isProduction
  }
}

function getOAuthCookieName(key: string) {
  return `gardesa-oauth-${Buffer.from(key).toString('base64url')}`
}

function readOAuthKeys(req: Request) {
  const rawValue = req.cookies?.[OAUTH_KEYS_COOKIE]

  if (!rawValue) {
    return new Set<string>()
  }

  try {
    const parsed = JSON.parse(rawValue)
    return new Set(Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function writeOAuthKeys(req: Request, res: Response, keys: Set<string>) {
  const serialized = JSON.stringify(Array.from(keys))
  res.cookie(OAUTH_KEYS_COOKIE, serialized, getOAuthCookieOptions())
  req.cookies[OAUTH_KEYS_COOKIE] = serialized
}

function clearOAuthFlowCookies(req: Request, res: Response) {
  const cookieOptions = getOAuthCookieOptions()
  const keys = readOAuthKeys(req)

  keys.forEach((key) => {
    const cookieName = getOAuthCookieName(key)
    res.clearCookie(cookieName, cookieOptions)
    delete req.cookies[cookieName]
  })

  res.clearCookie(OAUTH_KEYS_COOKIE, cookieOptions)
  res.clearCookie(OAUTH_REDIRECT_COOKIE, cookieOptions)
  delete req.cookies[OAUTH_KEYS_COOKIE]
  delete req.cookies[OAUTH_REDIRECT_COOKIE]
}

function createCookieStorage(req: Request, res: Response) {
  return {
    getItem(key: string) {
      return req.cookies?.[getOAuthCookieName(key)] ?? null
    },
    removeItem(key: string) {
      const cookieName = getOAuthCookieName(key)
      const keys = readOAuthKeys(req)
      const cookieOptions = getOAuthCookieOptions()

      keys.delete(key)
      writeOAuthKeys(req, res, keys)
      res.clearCookie(cookieName, cookieOptions)
      delete req.cookies[cookieName]
    },
    setItem(key: string, value: string) {
      const cookieName = getOAuthCookieName(key)
      const keys = readOAuthKeys(req)

      keys.add(key)
      writeOAuthKeys(req, res, keys)
      res.cookie(cookieName, value, getOAuthCookieOptions())
      req.cookies[cookieName] = value
    }
  }
}

function createPublicAuthClient() {
  if (!supabasePublicKey) {
    throw new Error('Variavel SUPABASE_PUBLISHABLE_KEY ou SUPABASE_ANON_KEY nao configurada')
  }

  return createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    }
  })
}

function createOAuthClient(req: Request, res: Response) {
  if (!supabasePublicKey) {
    throw new Error('Variavel SUPABASE_PUBLISHABLE_KEY ou SUPABASE_ANON_KEY nao configurada')
  }

  return createClient(supabaseUrl, supabasePublicKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'pkce',
      persistSession: true,
      storage: createCookieStorage(req, res),
      storageKey: OAUTH_STORAGE_KEY
    }
  })
}

function getOAuthRedirectState(req: Request) {
  try {
    const rawValue = req.cookies?.[OAUTH_REDIRECT_COOKIE]

    if (!rawValue) {
      return { mode: 'login', next: '/app' }
    }

    const parsed = JSON.parse(rawValue) as { mode?: string; next?: string }

    return {
      mode: parsed.mode === 'register' ? 'register' : 'login',
      next: getSafeRedirectPath(parsed.next)
    }
  } catch {
    return { mode: 'login', next: '/app' }
  }
}

function getRequestOrigin(req: Request) {
  return `${req.protocol}://${req.get('host')}`
}

router.get('/auth/login', redirectIfAuthenticated, noStore, (req, res) => {
  renderLogin(req, res)
})

router.get('/auth/cadastro', redirectIfAuthenticated, noStore, (req, res) => {
  renderRegister(req, res)
})

router.get('/auth/google', redirectIfAuthenticated, noStore, async (req, res) => {
  const mode = req.query.mode === 'register' ? 'register' : 'login'
  const nextPath = getSafeRedirectPath(req.query.next)
  const redirectTarget = mode === 'register' ? '/auth/cadastro' : '/auth/login'

  if (!hasSupabasePublicCredentials()) {
    return res.redirect(`${redirectTarget}?status=google-failed&next=${encodeURIComponent(nextPath)}`)
  }

  try {
    const client = createOAuthClient(req, res)
    const callbackUrl = new URL('/auth/callback', getRequestOrigin(req))
    callbackUrl.searchParams.set('mode', mode)
    callbackUrl.searchParams.set('next', nextPath)

    res.cookie(
      OAUTH_REDIRECT_COOKIE,
      JSON.stringify({ mode, next: nextPath }),
      getOAuthCookieOptions()
    )

    const { data, error } = await client.auth.signInWithOAuth({
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        redirectTo: callbackUrl.toString()
      },
      provider: 'google'
    })

    if (error || !data?.url) {
      clearOAuthFlowCookies(req, res)
      return res.redirect(`${redirectTarget}?status=google-failed&next=${encodeURIComponent(nextPath)}`)
    }

    return res.redirect(data.url)
  } catch (error) {
    console.error('[Auth] Erro ao iniciar Google OAuth:', error)
    clearOAuthFlowCookies(req, res)
    return res.redirect(`${redirectTarget}?status=google-failed&next=${encodeURIComponent(nextPath)}`)
  }
})

router.get('/auth/callback', noStore, async (req, res) => {
  const code = typeof req.query.code === 'string' ? req.query.code : ''
  const authError =
    typeof req.query.error_description === 'string'
      ? req.query.error_description
      : typeof req.query.error === 'string'
        ? req.query.error
        : ''
  const { mode, next } = getOAuthRedirectState(req)
  const fallbackTarget = mode === 'register' ? '/auth/cadastro' : '/auth/login'

  if (!hasSupabasePublicCredentials()) {
    clearOAuthFlowCookies(req, res)
    return res.redirect(`${fallbackTarget}?status=google-failed&next=${encodeURIComponent(next)}`)
  }

  if (authError) {
    clearOAuthFlowCookies(req, res)
    return res.redirect(`${fallbackTarget}?status=google-failed&next=${encodeURIComponent(next)}`)
  }

  if (!code) {
    return res.render('auth-callback', {
      nextPath: next,
      supabasePublicEnabled: hasSupabasePublicCredentials(),
      supabasePublicKey: supabasePublicKey ?? '',
      supabaseUrl
    })
  }

  try {
    const client = createOAuthClient(req, res)
    const { data, error } = await client.auth.exchangeCodeForSession(code)

    if (error || !data.session) {
      clearOAuthFlowCookies(req, res)
      return res.redirect(`${fallbackTarget}?status=google-failed&next=${encodeURIComponent(next)}`)
    }

    setSessionCookies(res, data.session)
    clearOAuthFlowCookies(req, res)
    return res.redirect(next)
  } catch (error) {
    console.error('[Auth] Erro ao concluir Google OAuth:', error)
    clearOAuthFlowCookies(req, res)
    return res.redirect(`${fallbackTarget}?status=google-failed&next=${encodeURIComponent(next)}`)
  }
})

router.post('/auth/login', redirectIfAuthenticated, authRateLimit, noStore, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    return renderLogin(req, res, {
      authError: 'Revise os campos destacados e tente novamente.',
      fieldErrors: getFieldErrors(parsed.error),
      values: {
        email: String(req.body?.email ?? '').trim(),
        password: String(req.body?.password ?? '')
      }
    })
  }

  if (!hasSupabasePublicCredentials()) {
    return renderLogin(req, res, {
      authError:
        'A autenticacao ainda nao esta configurada no servidor. Adicione a chave publica do Supabase para habilitar o login.',
      values: { email: parsed.data.email, password: parsed.data.password }
    })
  }

  try {
    const client = createPublicAuthClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    })

    if (error || !data.session) {
      return renderLogin(req, res, {
        authError: 'E-mail ou senha invalidos.',
        values: { email: parsed.data.email, password: parsed.data.password }
      })
    }

    setSessionCookies(res, data.session)
    return res.redirect(getSafeRedirectPath(req.body?.next))
  } catch (error) {
    console.error('[Auth] Erro ao fazer login:', error)
    return renderLogin(req, res, {
      authError: 'Nao foi possivel concluir o login agora. Tente novamente em instantes.',
      values: { email: parsed.data.email, password: parsed.data.password }
    })
  }
})

router.post('/auth/cadastro', redirectIfAuthenticated, authRateLimit, noStore, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    return renderRegister(req, res, {
      authError: 'Revise os campos destacados e tente novamente.',
      fieldErrors: getFieldErrors(parsed.error),
      values: {
        confirmPassword: String(req.body?.confirmPassword ?? ''),
        email: String(req.body?.email ?? '').trim(),
        name: String(req.body?.name ?? '').trim(),
        password: String(req.body?.password ?? '')
      }
    })
  }

  if (!hasSupabasePublicCredentials()) {
    return renderRegister(req, res, {
      authError:
        'A autenticacao ainda nao esta configurada no servidor. Adicione a chave publica do Supabase para habilitar o cadastro.',
      values: {
        confirmPassword: parsed.data.confirmPassword,
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password
      }
    })
  }

  try {
    const { error: createUserError } = await supabase.auth.admin.createUser({
      email: parsed.data.email,
      email_confirm: true,
      password: parsed.data.password,
      user_metadata: {
        full_name: parsed.data.name,
        name: parsed.data.name
      }
    })

    if (createUserError) {
      const duplicateEmail = /already|duplicate|exists|registered/i.test(createUserError.message)

      return renderRegister(req, res, {
        authError: duplicateEmail
          ? 'Ja existe uma conta com esse e-mail.'
          : 'Nao foi possivel criar sua conta agora. Tente novamente em instantes.',
        values: {
          confirmPassword: parsed.data.confirmPassword,
          email: parsed.data.email,
          name: parsed.data.name,
          password: parsed.data.password
        }
      })
    }

    const client = createPublicAuthClient()
    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    })

    if (error || !data.session) {
      return res.redirect(
        `/auth/login?status=account-created&next=${encodeURIComponent(getSafeRedirectPath(req.body?.next))}`
      )
    }

    setSessionCookies(res, data.session)
    return res.redirect(getSafeRedirectPath(req.body?.next))
  } catch (error) {
    console.error('[Auth] Erro ao criar conta:', error)
    return renderRegister(req, res, {
      authError: 'Nao foi possivel criar sua conta agora. Tente novamente em instantes.',
      values: {
        confirmPassword: parsed.data.confirmPassword,
        email: parsed.data.email,
        name: parsed.data.name,
        password: parsed.data.password
      }
    })
  }
})

router.post('/auth/session', noStore, async (req, res) => {
  if (!hasSupabasePublicCredentials()) {
    return res.status(500).json({
      error: 'A chave publica do Supabase nao foi configurada no servidor.'
    })
  }

  const parsed = sessionSyncSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Nao foi possivel validar a sessao recebida.'
    })
  }

  try {
    const client = createPublicAuthClient()
    const { data, error } = await client.auth.setSession({
      access_token: parsed.data.accessToken,
      refresh_token: parsed.data.refreshToken
    })

    if (error || !data.session) {
      return res.status(401).json({
        error: 'Nao foi possivel validar a sessao do Google.'
      })
    }

    setSessionCookies(res, data.session)

    return res.json({
      next: getSafeRedirectPath(parsed.data.next),
      ok: true
    })
  } catch (error) {
    console.error('[Auth] Erro ao sincronizar sessao:', error)
    return res.status(500).json({
      error: 'Erro interno ao iniciar a sessao.'
    })
  }
})

router.post('/auth/logout', noStore, async (req, res) => {
  if (hasSupabasePublicCredentials()) {
    const { accessToken, refreshToken } = readSessionTokens(req)

    if (accessToken && refreshToken) {
      try {
        const client = createPublicAuthClient()
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        await client.auth.signOut({ scope: 'local' })
      } catch (error) {
        console.warn('[Auth] Erro ao encerrar sessao no Supabase:', error)
      }
    }
  }

  clearSessionCookies(res)
  return res.redirect('/auth/login?status=signed-out')
})

router.get('/app', requireAuth, noStore, (req, res) => {
  const currentUser = req.authUser ?? res.locals.currentUser

  res.render('app-home', {
    pageTitle: 'Espaco Gardesa',
    userEmail: currentUser?.email ?? '',
    userName: getUserDisplayName(currentUser)
  })
})

export default router
