<script setup lang="ts">
import { authClient } from '~~/lib/auth-client';

useSeoMeta({
  title: 'Início',
  description: 'Portal de suporte técnico.',
});

const { data: session } = await authClient.useSession(useFetch);

const greeting = ref('Olá');
onMounted(() => {
  const hour = new Date().getHours();
  greeting.value =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
});

const userName = computed(() => session.value?.user?.name ?? '');

const actions = [
  {
    label: 'Abrir Chamado',
    description:
      'Abra um chamado indicando seu problema em relação ao computador.',
    icon: 'i-lucide-plus',
    to: '/tickets/new',
  },
  {
    label: 'Acessar o sistema de visitantes',
    description: 'Acesso ao sistema de visitates do RP Avançado',
    icon: 'i-lucide-list',
    to: '/visitor/',
  },
];
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        {{ greeting }}{{ userName ? `, ${userName}` : '' }}!
      </h1>
      <p class="text-sm text-muted mt-1">O que você deseja fazer?</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UCard
        v-for="action in actions"
        :key="action.to"
        class="cursor-pointer hover:ring-primary transition-shadow"
        @click="navigateTo(action.to)"
      >
        <div class="flex items-start gap-4">
          <div class="p-3 rounded-xl bg-primary/10">
            <UIcon :name="action.icon" class="text-primary text-xl" />
          </div>
          <div>
            <p class="font-semibold text-highlighted">{{ action.label }}</p>
            <p class="text-sm text-muted mt-1">{{ action.description }}</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
