import express from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config()

import waitlistRouter from './routes/waitlist'

const app = express()
const PORT = process.env.PORT ?? 3000

// Segurança
app.use(helmet({ contentSecurityPolicy: false }))

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
app.set('views', path.join(__dirname, 'views'))

// Rota principal — busca contagem da waitlist
app.get('/', async (req, res) => {
  try {
    const { supabase } = await import('./config/supabase')
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true })

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

// 404
app.use((req, res) => {
  res.status(404).render('404')
})

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`)
})