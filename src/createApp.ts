import express, { type Express, type RequestHandler } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'

import { getWaitlistCount } from './services/waitlist'
import { attachAuthenticatedUser } from './middlewares/auth'
import waitlistRouter from './routes/waitlist'
import authRouter from './routes/auth'
import memberRouter from './routes/member'

export function createApp(): Express {
  const app = express()
  const systemAccessEnabled = isSystemAccessEnabled()

  app.use(helmet({ contentSecurityPolicy: false }))
  app.set('trust proxy', 1)

  app.use(express.urlencoded({ extended: true, limit: '2mb' }))
  app.use(express.json({ limit: '2mb' }))
  app.use(cookieParser())

  app.use(express.static(path.join(process.cwd(), 'public')))

  app.set('view engine', 'ejs')
  app.set('views', path.join(process.cwd(), 'src/views'))

  app.use(setSystemAccessLocals(systemAccessEnabled))
  app.use(redirectUnavailableSystemRoutes(systemAccessEnabled))

  if (systemAccessEnabled) {
    app.use(attachAuthenticatedUser)
  }

  app.get('/', async (_req, res) => {
    try {
      const count = await getWaitlistCount()

      res.render('landing', {
        waitlistCount: count,
        waitlistSucesso: false,
        waitlistErro: undefined
      })
    } catch {
      res.render('landing', {
        waitlistCount: null,
        waitlistSucesso: false,
        waitlistErro: undefined
      })
    }
  })

  app.use(waitlistRouter)

  if (systemAccessEnabled) {
    app.use(authRouter)
    app.use(memberRouter)
  }

  return app
}

export function isSystemAccessEnabled(): boolean {
  const configured = process.env.SYSTEM_ACCESS_ENABLED?.trim().toLowerCase()

  if (!configured) {
    return process.env.VERCEL_ENV !== 'production'
  }

  return ['1', 'true', 'yes', 'on'].includes(configured)
}

function setSystemAccessLocals(systemAccessEnabled: boolean): RequestHandler {
  return (_req, res, next) => {
    res.locals.currentUser = null
    res.locals.authActionUrl = systemAccessEnabled ? '/auth' : '#waitlist'
    next()
  }
}

function redirectUnavailableSystemRoutes(systemAccessEnabled: boolean): RequestHandler {
  return (req, res, next) => {
    if (systemAccessEnabled || !isSystemRoute(req.path)) {
      next()
      return
    }

    res.redirect(303, '/')
  }
}

function isSystemRoute(pathname: string): boolean {
  return pathname === '/auth'
    || pathname.startsWith('/auth/')
    || pathname === '/member'
    || pathname.startsWith('/member/')
}
