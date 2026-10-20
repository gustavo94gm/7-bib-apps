import { db } from '~~/server/index'
import { tickets } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const id = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : null)

  const values = {
    title: text(body?.title),
    description: text(body?.description),
    categoryId: id(body?.categoryId),
    requesterName: text(body?.requesterName),
    requesterGraduationId: id(body?.requesterGraduationId),
    requesterSectionId: id(body?.requesterSectionId),
  }

  if (Object.values(values).some((v) => !v)) {
    throw createError({ statusCode: 400, message: 'Preencha todos os campos obrigatórios.' })
  }

  const [ticket] = await db.insert(tickets).values({
    ...values,
    status: 'open',
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning()

  return ticket
})
