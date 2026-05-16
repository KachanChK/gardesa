import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

import { getWaitlistCount } from './services/waitlist'
import { attachAuthenticatedUser } from './middlewares/auth'
import waitlistRouter from './routes/waitlist'
import authRouter from './routes/auth'
import memberRouter from './routes/member'
import legacyDisabledRouter from './routes/legacy-disabled'

const app = express()
const PORT = process.env.PORT ?? 3000

// Segurança
app.use(helmet({ contentSecurityPolicy: false }))

// Confia no proxy (necessário para req.ip correto com rate limiting)
app.set('trust proxy', 1)

// Parse de body e cookies
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

// Arquivos estáticos
app.use(express.static(path.join(__dirname, '../public')))
app.use(attachAuthenticatedUser)

// Template engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../src/views'))

// Rota principal — busca contagem da waitlist
app.get('/', async (req, res) => {
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

// Rotas
app.use(waitlistRouter)
app.use(authRouter)
app.use(memberRouter)
app.use(legacyDisabledRouter)

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`)
})
