import { db } from '~~/server/index'
import { categories } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { name } = body

  if (!name?.trim()) {
    throw createError({ statusCode: 400, message: 'Nome é obrigatório.' })
  }


  const [created] = await db.insert(categories).values({
    name: name.trim(),
    createdAt: new Date(),
  }).returning()

  return created
})
