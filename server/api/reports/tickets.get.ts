import { drizzle } from "drizzle-orm/node-postgres";
import { tickets, categories, graduations, sections } from "../../db/schema";
import { eq, ilike, and, gte, lte, SQL } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const db = drizzle(process.env.DATABASE_URL!);
  const query = getQuery(event);

  const status = query.status as string | undefined;
  const categoryId = query.categoryId ? Number(query.categoryId) : undefined;
  const sectionId = query.sectionId ? Number(query.sectionId) : undefined;
  const graduationId = query.graduationId
    ? Number(query.graduationId)
    : undefined;
  const requester = query.requester as string | undefined;
  const dateFrom = query.dateFrom as string | undefined;
  const dateTo = query.dateTo as string | undefined;

  const conditions: SQL[] = [];

  if (status) conditions.push(eq(tickets.status, status));
  if (categoryId) conditions.push(eq(tickets.categoryId, categoryId));
  if (sectionId) conditions.push(eq(tickets.requesterSectionId, sectionId));
  if (graduationId)
    conditions.push(eq(tickets.requesterGraduationId, graduationId));
  if (requester)
    conditions.push(ilike(tickets.requesterName, `%${requester}%`));
  if (dateFrom) conditions.push(gte(tickets.createdAt, new Date(dateFrom)));
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(tickets.createdAt, end));
  }

  const rows = await db
    .select({
      id: tickets.id,
      title: tickets.title,
      status: tickets.status,
      requesterName: tickets.requesterName,
      createdAt: tickets.createdAt,
      closedAt: tickets.closedAt,
      category: { id: categories.id, name: categories.name },
      graduation: {
        id: graduations.id,
        abbreviation: graduations.abbreviation,
      },
      section: { id: sections.id, name: sections.name },
    })
    .from(tickets)
    .leftJoin(categories, eq(tickets.categoryId, categories.id))
    .leftJoin(graduations, eq(tickets.requesterGraduationId, graduations.id))
    .leftJoin(sections, eq(tickets.requesterSectionId, sections.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(tickets.createdAt);

  const total = rows.length;
  const byStatus = {
    open: rows.filter((r) => r.status === "open").length,
    in_progress: rows.filter((r) => r.status === "in_progress").length,
    closed: rows.filter((r) => r.status === "closed").length,
  };

  const closedWithTimes = rows.filter(
    (r) => r.status === "closed" && r.createdAt && r.closedAt,
  );
  const avgResolutionHours =
    closedWithTimes.length > 0
      ? Math.round(
          closedWithTimes.reduce((acc: number, r) => {
            const diff =
              new Date(r.closedAt!).getTime() -
              new Date(r.createdAt!).getTime();
            return acc + diff / 1000 / 60 / 60;
          }, 0) / closedWithTimes.length,
        )
      : null;

  const byCategory: Record<string, number> = {};
  for (const r of rows) {
    const key = r.category?.name ?? "Sem categoria";
    byCategory[key] = (byCategory[key] ?? 0) + 1;
  }

  const bySection: Record<string, number> = {};
  for (const r of rows) {
    const key = r.section?.name ?? "Sem seção";
    bySection[key] = (bySection[key] ?? 0) + 1;
  }

  return {
    summary: { total, byStatus, avgResolutionHours },
    byCategory,
    bySection,
    tickets: rows,
  };
});
