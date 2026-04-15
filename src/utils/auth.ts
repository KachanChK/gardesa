import type { CookieOptions, Request, Response } from 'express'
import type { Session } from '@supabase/supabase-js'
import { isProduction } from '../config/app'

export const ACCESS_TOKEN_COOKIE = 'gardesa-access-token'
export const REFRESH_TOKEN_COOKIE = 'gardesa-refresh-token'

const cookieOptions: CookieOptions = {
  httpOnly: true,
  maxAge: 1000 * 60 * 60 * 24 * 365,
  path: '/',
  sameSite: 'lax',
  secure: isProduction
}

export function setSessionCookies(res: Response, session: Session) {
  res.cookie(ACCESS_TOKEN_COOKIE, session.access_token, cookieOptions)
  res.cookie(REFRESH_TOKEN_COOKIE, session.refresh_token, cookieOptions)
}

export function clearSessionCookies(res: Response) {
  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions)
  res.clearCookie(REFRESH_TOKEN_COOKIE, cookieOptions)
}

export function readSessionTokens(req: Request) {
  return {
    accessToken: req.cookies?.[ACCESS_TOKEN_COOKIE] as string | undefined,
    refreshToken: req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined
  }
}

export function setNoStore(res: Response) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
}
