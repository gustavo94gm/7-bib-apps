import { db } from '~~/server/index'
import { eq } from 'drizzle-orm'
import { graduations } from '../../db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido.' })
  }


  await db.delete(graduations).where(eq(graduations.id, id))

  return { success: true }
})
