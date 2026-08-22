import { drizzle } from 'drizzle-orm/node-postgres'
import { graduations } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { abbreviation } = body

  if (!abbreviation?.trim()) {
    throw createError({ statusCode: 400, message: 'Abreviação é obrigatória.' })
  }

  const db = drizzle(process.env.DATABASE_URL!)
  const [created] = await db.insert(graduations).values({
    abbreviation: abbreviation.trim(),
    createdAt: new Date(),
  }).returning()

  return created
})
