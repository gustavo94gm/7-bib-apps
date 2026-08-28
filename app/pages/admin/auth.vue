<script setup lang="ts">
import { signIn, useSession } from '~~/lib/auth-client';

definePageMeta({
  layout: 'blank',
});

useSeoMeta({
  title: 'Acesso Administrativo',
  description: 'Faça login para acessar o painel de administração.',
});

const router = useRouter();
const route = useRoute();

const sessionState = useSession();
const session = computed(() => sessionState.value?.data ?? null);

function defaultTargetForRole(role: string | undefined) {
  if (role === 'admin') return '/tickets/list';
  if (role === 'rp') return '/visitor';
  return '/tickets/new';
}

onMounted(() => {
  watch(
    session,
    (s) => {
      if (!s?.user) return;
      const redirect = route.query.redirect as string | undefined;
      const target = redirect || defaultTargetForRole((s.user as any).role);
      if (target) router.replace(target);
    },
    { immediate: true },
  );
});

const form = reactive({
  email: '',
  password: '',
});

const loading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
  errorMsg.value = '';
  loading.value = true;
  try {
    const { error } = await signIn.email({
      email: form.email,
      password: form.password,
    });

    if (error) {
      errorMsg.value = 'Email ou senha inválidos.';
      return;
    }

    await router.push((route.query.redirect as string) || '/tickets/new');
  } catch {
    errorMsg.value = 'Erro ao fazer login. Tente novamente.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-default p-4">
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
      />
      <div
        class="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl"
      />
    </div>

    <div class="relative w-full max-w-sm space-y-6">
      <div class="text-center space-y-2">
        <div
          class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-2"
        >
          <UIcon name="i-lucide-shield-check" class="text-2xl text-primary" />
        </div>
        <h1 class="text-2xl font-bold text-highlighted">Área Administrativa</h1>
        <p class="text-sm text-muted">
          Acesso restrito. Faça login com suas credenciais.
        </p>
      </div>

      <UCard
        :ui="{
          root: 'shadow-xl border border-default',
          body: 'p-6',
        }"
      >
        <form class="space-y-4" @submit.prevent="handleLogin">
          <!-- Error alert -->
          <UAlert
            v-if="errorMsg"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-x"
            :description="errorMsg"
            :close-button="{
              icon: 'i-lucide-x',
              color: 'error',
              variant: 'link',
            }"
            @close="errorMsg = ''"
          />

          <UFormField label="Email" required>
            <UInput
              v-model="form.email"
              type="email"
              placeholder="admin@exemplo.com"
              icon="i-lucide-mail"
              autocomplete="email"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Senha" required>
            <UInput
              v-model="form.password"
              type="password"
              placeholder="••••••••"
              icon="i-lucide-lock"
              autocomplete="current-password"
              required
              class="w-full"
            />
          </UFormField>

          <UButton
            type="submit"
            class="w-full justify-center"
            :loading="loading"
            icon="i-lucide-log-in"
            size="lg"
          >
            Entrar
          </UButton>
        </form>
      </UCard>

      <!-- Footer -->
      <p class="text-center text-xs text-muted">
        7ª BIB — Sistema de Gerenciamento de Chamados
      </p>
    </div>
  </div>
</template>
