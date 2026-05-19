import dotenv from 'dotenv'
dotenv.config()

import { createApp } from './createApp'

const app = createApp()
const PORT = process.env.PORT ?? 3000

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`)
  })
}

export default app
