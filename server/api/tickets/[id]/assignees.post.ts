import { db } from '~~/server/index'
import { ticketAssignees } from "../../../db/schema";
import { user } from "../../../db/auth-schema";
import { eq } from "drizzle-orm";

export default defineEventHandler(async (event) => {
  const ticketId = Number(getRouterParam(event, "id"));
  const body = await readBody(event);

  if (isNaN(ticketId)) {
    throw createError({ statusCode: 400, message: "ID do chamado inválido" });
  }

  const { userId } = body;
  if (!userId) {
    throw createError({ statusCode: 400, message: "userId é obrigatório" });
  }

  const [existingUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(user)
    .where(eq(user.id, userId));

  if (!existingUser) {
    throw createError({ statusCode: 404, message: "Usuário não encontrado" });
  }

  await db
    .insert(ticketAssignees)
    .values({
      ticketId,
      userId,
    })
    .onConflictDoNothing();

  return {
    userId: existingUser.id,
    userName: existingUser.name,
    userEmail: existingUser.email,
    userImage: existingUser.image,
  };
});
