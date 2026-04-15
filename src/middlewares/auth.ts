import type { NextFunction, Request, Response } from 'express'
import type { Session, User } from '@supabase/supabase-js'
import { createSupabasePublicClient, hasSupabasePublicCredentials } from '../config/supabase'
import { clearSessionCookies, readSessionTokens, setNoStore, setSessionCookies } from '../utils/auth'
import { getSafeRedirectPath } from '../utils/validation'

declare global {
  namespace Express {
    interface Request {
      authSession?: Session | null
      authUser?: User | null
    }
  }
}

function applyAuthenticatedState(req: Request, res: Response, user: User, session?: Session | null) {
  req.authUser = user
  req.authSession = session ?? null
  res.locals.currentUser = user
  res.locals.isAuthenticated = true
}

export async function attachAuthSession(req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = null
  res.locals.isAuthenticated = false

  if (!hasSupabasePublicCredentials()) {
    return next()
  }

  const { accessToken, refreshToken } = readSessionTokens(req)

  if (!accessToken || !refreshToken) {
    return next()
  }

  try {
    const client = createSupabasePublicClient()
    const {
      data: { user },
      error
    } = await client.auth.getUser(accessToken)

    if (!error && user) {
      applyAuthenticatedState(req, res, user)
      return next()
    }

    const { data, error: refreshError } = await client.auth.refreshSession({
      refresh_token: refreshToken
    })

    if (refreshError || !data.session || !data.user) {
      clearSessionCookies(res)
      return next()
    }

    setSessionCookies(res, data.session)
    setNoStore(res)
    applyAuthenticatedState(req, res, data.user, data.session)
  } catch {
    clearSessionCookies(res)
  }

  return next()
}

export function redirectIfAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (res.locals.isAuthenticated) {
    const nextPath = getSafeRedirectPath(req.query.next, '/app')
    return res.redirect(nextPath)
  }

  return next()
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  setNoStore(res)

  if (!res.locals.isAuthenticated) {
    const nextPath = getSafeRedirectPath(req.originalUrl, '/app')
    return res.redirect(`/auth/login?next=${encodeURIComponent(nextPath)}&status=session-expired`)
  }

  return next()
}

export function noStore(_req: Request, res: Response, next: NextFunction) {
  setNoStore(res)
  next()
}
