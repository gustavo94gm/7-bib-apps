import { db } from '~~/server/index'
import {
  tickets,
  categories,
  graduations,
  sections,
  ticketAssignees,
  comments,
} from "../../db/schema";
import { user } from "../../db/auth-schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: "ID inválido" });
  }

  const [ticket] = await db
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
    .where(eq(tickets.id, id));

  if (!ticket) {
    throw createError({ statusCode: 404, message: "Chamado não encontrado" });
  }

  const assigneeRows = await db
    .select({
      userId: ticketAssignees.userId,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(ticketAssignees)
    .leftJoin(user, eq(ticketAssignees.userId, user.id))
    .where(eq(ticketAssignees.ticketId, id));

  const commentRows = await db
    .select()
    .from(comments)
    .where(eq(comments.ticketId, id));

  return {
    ...ticket,
    assignees: assigneeRows,
    comments: commentRows,
  };
});
