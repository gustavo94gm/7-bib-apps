import { db } from '~~/server/index'
import { graduations } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { abbreviation } = body

  if (!abbreviation?.trim()) {
    throw createError({ statusCode: 400, message: 'Abreviação é obrigatória.' })
  }


  const [created] = await db.insert(graduations).values({
    abbreviation: abbreviation.trim(),
    createdAt: new Date(),
  }).returning()

  return created
})
