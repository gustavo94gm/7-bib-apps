import { db } from '~~/server/index'
import { eq } from 'drizzle-orm'
import { categories } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido.' })
  }


  await db.delete(categories).where(eq(categories.id, id))

  return { success: true }
})
