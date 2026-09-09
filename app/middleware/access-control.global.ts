import { authClient } from '~~/lib/auth-client';
import { canAccess } from '~~/lib/access';

const PUBLIC_PATHS = ['/', '/tickets/new', '/admin/auth', '/access-denied'];

function isVisitorPath(path: string) {
  return path === '/visitor' || path.startsWith('/visitor/');
}

export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return;
  if (PUBLIC_PATHS.includes(to.path)) return;

  const { data: session } = await authClient.getSession();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session?.user) {
    return navigateTo(
      `/admin/auth?redirect=${encodeURIComponent(to.fullPath)}`,
    );
  }

  if (canAccess(role, isVisitorPath(to.path))) return;

  const required = isVisitorPath(to.path) ? 'rp' : 'admin';
  return navigateTo(
    `/access-denied?current=${encodeURIComponent(role ?? '')}&required=${required}`,
  );
});
