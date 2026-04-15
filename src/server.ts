import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

import { appUrl, port } from './config/app'
import { supabaseUrl } from './config/supabase'
import { attachAuthSession } from './middlewares/auth'
import authRouter from './routes/auth'
import waitlistRouter from './routes/waitlist'

const app = express()
const supabaseOrigin = new URL(supabaseUrl).origin
const PORT = port

// Segurança
app.disable('x-powered-by')

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        baseUri: ["'self'"],
        connectSrc: ["'self'", supabaseOrigin],
        defaultSrc: ["'self'"],
        fontSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' }
  })
)

// Confia no proxy (necessário para req.ip correto com rate limiting)
app.set('trust proxy', 1)

// Parse de body e cookies
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cookieParser())

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')))

// Template engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../src/views'))

app.use(attachAuthSession)
app.use((_, res, next) => {
  res.locals.appUrl = appUrl
  next()
})

// Rota principal — busca contagem da waitlist
app.get('/', async (req, res) => {
  const hasAuthParams =
    typeof req.query.code === 'string' ||
    typeof req.query.error === 'string' ||
    typeof req.query.error_description === 'string'

  if (hasAuthParams) {
    const originalQuery = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : ''
    return res.redirect(`/auth/callback${originalQuery}`)
  }

  try {
    const { supabase } = await import('./config/supabase')
    const { count } = await supabase.from('waitlist').select('*', { count: 'exact', head: true })

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

// Rotas
app.use(authRouter)
app.use(waitlistRouter)

// 404
app.use((_req, res) => {
  res.status(404).render('404')
})

app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`)
})
