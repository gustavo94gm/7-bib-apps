<script setup lang="ts">
useSeoMeta({
  title: 'Acesso negado',
  description: 'Você não tem permissão para acessar esta tela.',
});

const route = useRoute();

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  rp: 'RP',
  infor: 'Infor',
};

function roleLabel(role: string | undefined) {
  if (!role) return 'Nenhuma';
  return roleLabels[role] ?? role;
}

const currentRole = computed(() => route.query.current as string | undefined);
const requiredRole = computed(() => route.query.required as string | undefined);
</script>

<template>
  <div class="min-h-[60vh] flex items-center justify-center">
    <div class="max-w-md w-full text-center space-y-6">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-error/10 border border-error/20">
        <UIcon name="i-lucide-shield-x" class="text-3xl text-error" />
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-semibold text-highlighted">Acesso negado</h1>
        <p class="text-sm text-muted">
          Você não tem permissão para acessar esta tela.
        </p>
      </div>

      <div class="flex justify-center gap-3 text-sm">
        <div class="rounded-lg border border-default px-4 py-2">
          <p class="text-xs text-muted uppercase tracking-wider mb-1">Sua role</p>
          <p class="font-medium text-highlighted">{{ roleLabel(currentRole) }}</p>
        </div>
        <div class="rounded-lg border border-default px-4 py-2">
          <p class="text-xs text-muted uppercase tracking-wider mb-1">Role necessária</p>
          <p class="font-medium text-highlighted">{{ roleLabel(requiredRole) }}</p>
        </div>
      </div>

      <UButton to="/tickets/new" label="Voltar" icon="i-lucide-arrow-left" color="neutral" variant="subtle" />
    </div>
  </div>
</template>
