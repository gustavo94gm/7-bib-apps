import { authClient } from "~~/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith("/visitor")) {
    return;
  }

  if (import.meta.server) return;

  const { data: session } = await authClient.getSession();

  if (!session?.user) {
    return navigateTo(`/admin/auth?redirect=${encodeURIComponent(to.fullPath)}`);
  }

  const role = (session.user as any).role;
  if (role !== "rp") {
    const toast = useToast();
    toast.add({
      title: "Acesso negado",
      description: "Você não tem permissão para acessar o sistema de controle de visitantes.",
      color: "error",
    });
    return navigateTo("/");
  }
});
