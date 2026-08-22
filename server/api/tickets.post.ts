import { drizzle } from 'drizzle-orm/node-postgres'
import { tickets } from '../db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const db = drizzle(process.env.DATABASE_URL!)

  const [ticket] = await db.insert(tickets).values({
    title: body.title,
    description: body.description,
    status: 'open',
    categoryId: body.categoryId,
    requesterName: body.requesterName,
    requesterGraduationId: body.requesterGraduationId,
    requesterSectionId: body.requesterSectionId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }).returning()

  return ticket
})
