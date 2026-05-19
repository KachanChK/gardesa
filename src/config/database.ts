import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('Variavel DATABASE_URL e obrigatoria')
}

export const db = new Pool({
  connectionString
})

export async function closeDatabaseConnection(): Promise<void> {
  await db.end()
}
