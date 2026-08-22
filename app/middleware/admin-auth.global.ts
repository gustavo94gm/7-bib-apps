import { authClient } from "~~/lib/auth-client";

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith("/admin") || to.path === "/admin/auth") {
    return;
  }

  if (import.meta.server) return;

  const { data: session } = await authClient.getSession();

  if (!session?.user) {
    return navigateTo("/admin/auth");
  }

  const role = (session.user as any).role;
  if (role !== "admin") {
    return navigateTo("/admin/auth");
  }
});
