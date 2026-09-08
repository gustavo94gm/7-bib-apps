import { db } from '~~/server/index'
import { ticketAssignees } from '../../../db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const ticketId = Number(getRouterParam(event, 'id'))
  const query = getQuery(event)
  const userId = query.userId as string

  if (isNaN(ticketId)) {
    throw createError({ statusCode: 400, message: 'ID do chamado inválido' })
  }

  if (!userId) {
    throw createError({ statusCode: 400, message: 'userId é obrigatório' })
  }

  await db
    .delete(ticketAssignees)
    .where(
      and(
        eq(ticketAssignees.ticketId, ticketId),
        eq(ticketAssignees.userId, userId)
      )
    )

  return { success: true }
})
