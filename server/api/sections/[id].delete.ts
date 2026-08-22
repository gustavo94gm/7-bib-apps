import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { sections } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido.' })
  }

  const db = drizzle(process.env.DATABASE_URL!)
  await db.delete(sections).where(eq(sections.id, id))

  return { success: true }
})
