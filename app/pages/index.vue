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

interface PublicTicket {
  id: number;
  status: string | null;
  requesterName: string | null;
  createdAt: string | null;
  category: string | null;
  graduation: string | null;
  section: string | null;
}

const { data: openTickets, pending: loadingTickets } = await useFetch<PublicTicket[]>('/api/tickets/public', {
  default: () => [],
});

const ticketSearch = ref('');
const filteredTickets = computed(() => {
  const q = ticketSearch.value.trim().toLowerCase();
  if (!q) return openTickets.value;
  return openTickets.value.filter(
    (t) => t.requesterName?.toLowerCase().includes(q) || String(t.id) === q.replace('#', '')
  );
});

const ticketColumns = [
  { accessorKey: 'id', header: 'Nº' },
  { accessorKey: 'graduation', header: 'Graduação' },
  { accessorKey: 'requesterName', header: 'Nome de guerra' },
  { accessorKey: 'section', header: 'Seção' },
  { accessorKey: 'category', header: 'Categoria' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'createdAt', header: 'Aberto em' },
];

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

    <div class="space-y-3">
      <div>
        <h2 class="text-lg font-semibold text-highlighted">Chamados em aberto</h2>
        <p class="text-sm text-muted">Acompanhe o andamento do seu chamado.</p>
      </div>

      <UInput
        v-model="ticketSearch"
        icon="i-lucide-search"
        placeholder="Buscar por nome de guerra ou nº do chamado..."
        class="w-full"
      />

      <UCard :ui="{ body: 'p-0' }">
        <UTable :data="filteredTickets" :columns="ticketColumns" :loading="loadingTickets">
          <template #id-cell="{ row }">#{{ row.original.id }}</template>
          <template #status-cell="{ row }">
            <UBadge
              :color="row.original.status === 'in_progress' ? 'info' : 'warning'"
              variant="subtle"
              size="sm"
            >
              {{ row.original.status === 'in_progress' ? 'Em andamento' : 'Aberto' }}
            </UBadge>
          </template>
          <template #createdAt-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDateTime(row.original.createdAt) }}</span>
          </template>
          <template #empty>
            <p class="text-sm text-muted text-center py-6">Nenhum chamado em aberto.</p>
          </template>
        </UTable>
      </UCard>
    </div>

    <p class="text-xs text-muted text-center">
      Desenvolvido por Sd Ev Gustavo Mueller
    </p>
  </div>
</template>
