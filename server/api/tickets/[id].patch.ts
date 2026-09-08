import { db } from '~~/server/index'
import { tickets } from "../../db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["open", "in_progress", "closed"] as const;
type TicketStatus = (typeof VALID_STATUSES)[number];

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody(event);

  if (isNaN(id)) {
    throw createError({ statusCode: 400, message: "ID inválido" });
  }

  const { status } = body as { status: TicketStatus };

  if (!status || !VALID_STATUSES.includes(status)) {
    throw createError({
      statusCode: 400,
      message: `Status inválido. Use: ${VALID_STATUSES.join(", ")}`,
    });
  }

  const [existing] = await db
    .select({ id: tickets.id })
    .from(tickets)
    .where(eq(tickets.id, id));

  if (!existing) {
    throw createError({ statusCode: 404, message: "Chamado não encontrado" });
  }

  const [updated] = await db
    .update(tickets)
    .set({
      status,
      closedAt: status === "closed" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(tickets.id, id))
    .returning({
      id: tickets.id,
      status: tickets.status,
      closedAt: tickets.closedAt,
      updatedAt: tickets.updatedAt,
    });

  return updated;
});
