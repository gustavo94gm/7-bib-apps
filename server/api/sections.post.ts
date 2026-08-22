import { drizzle } from 'drizzle-orm/node-postgres'
import { sections } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Nome é obrigatório.' })
  }

  const db = drizzle(process.env.DATABASE_URL!)
  const [created] = await db.insert(sections).values({
    name: name.trim(),
    createdAt: new Date(),
  }).returning()

  return created
})
