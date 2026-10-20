import { db } from '~~/server/index';
import { tickets, categories, graduations, sections } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';

export default defineEventHandler(async () => {
  return db
    .select({
      id: tickets.id,
      status: tickets.status,
      requesterName: tickets.requesterName,
      createdAt: tickets.createdAt,
      category: categories.name,
      graduation: graduations.abbreviation,
      section: sections.name,
    })
    .from(tickets)
    .leftJoin(categories, eq(tickets.categoryId, categories.id))
    .leftJoin(graduations, eq(tickets.requesterGraduationId, graduations.id))
    .leftJoin(sections, eq(tickets.requesterSectionId, sections.id))
    .where(inArray(tickets.status, ['open', 'in_progress']))
    .orderBy(tickets.createdAt);
});
