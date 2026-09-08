import { db } from '~~/server/index'
import { comments } from "../../../db/schema";
import { auth } from "~~/lib/auth";

export default defineEventHandler(async (event) => {
  const ticketId = Number(getRouterParam(event, "id"));

  if (isNaN(ticketId)) {
    throw createError({ statusCode: 400, message: "ID do chamado inválido" });
  }

  const session = await auth.api.getSession({
    headers: event.headers,
  });

  if (!session?.user) {
    throw createError({ statusCode: 401, message: "Usuário não autenticado" });
  }

  const body = await readBody(event);

  if (!body.content?.trim()) {
    throw createError({
      statusCode: 400,
      message: "Conteúdo do comentário é obrigatório",
    });
  }

  const [comment] = await db
    .insert(comments)
    .values({
      ticketId,
      authorId: session.user.id,
      authorName: session.user.name,
      content: body.content.trim(),
      createdAt: new Date(),
    })
    .returning();

  return comment;
});
