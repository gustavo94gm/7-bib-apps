import { drizzle } from 'drizzle-orm/node-postgres'
import { tickets, categories, graduations, sections } from '../../db/schema'
import { eq, ilike, or, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = drizzle(process.env.DATABASE_URL!)
  const query = getQuery(event)
  const status = query.status as string | undefined
  const search = query.search as string | undefined

  const conditions = []

  if (status) {
    conditions.push(eq(tickets.status, status))
  }

  if (search) {
    conditions.push(
      or(
        ilike(tickets.title, `%${search}%`),
        ilike(tickets.requesterName, `%${search}%`)
      )
    )
  }

  const rows = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      description: tickets.description,
      status: tickets.status,
      requesterName: tickets.requesterName,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt,
      closedAt: tickets.closedAt,
      category: {
        id: categories.id,
        name: categories.name,
      },
      graduation: {
        id: graduations.id,
        abbreviation: graduations.abbreviation,
      },
      section: {
        id: sections.id,
        name: sections.name,
      },
    })
    .from(tickets)
    .leftJoin(categories, eq(tickets.categoryId, categories.id))
    .leftJoin(graduations, eq(tickets.requesterGraduationId, graduations.id))
    .leftJoin(sections, eq(tickets.requesterSectionId, sections.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tickets.createdAt)

  return rows
})
