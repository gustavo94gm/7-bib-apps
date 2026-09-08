import { db } from '~~/server/index'
import { visitorLogs } from '../../db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: 'ID inválido' })
  }

  const [existing] = await db
    .select({ id: visitorLogs.id })
    .from(visitorLogs)
    .where(eq(visitorLogs.id, id))

  if (!existing) {
    throw createError({ statusCode: 404, message: 'Registro não encontrado' })
  }

  const [updated] = await db
    .update(visitorLogs)
    .set({ exitTime: body.exitTime })
    .where(eq(visitorLogs.id, id))
    .returning()

  return updated
})
