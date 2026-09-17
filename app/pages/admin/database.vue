<script setup lang="ts">
import { authClient } from '~~/lib/auth-client';

useSeoMeta({
  title: 'Banco de Dados',
  description: 'Visualize, adicione e remova entradas das tabelas do sistema.',
});

const { data: session } = await authClient.useSession(useFetch);
const readOnly = computed(() => (session.value?.user as any)?.role !== 'admin');

const activeTab = ref('categories');

const categoriesTable = useTemplateRef('categoriesTable');
const graduationsTable = useTemplateRef('graduationsTable');
const sectionsTable = useTemplateRef('sectionsTable');
const visitorSituationsTable = useTemplateRef('visitorSituationsTable');

const tabs = [
  {
    value: 'categories',
    slot: 'categories' as const,
    label: 'Categorias',
    icon: 'i-lucide-tag',
  },
  {
    value: 'graduations',
    slot: 'graduations' as const,
    label: 'Graduações',
    icon: 'i-lucide-award',
  },
  {
    value: 'sections',
    slot: 'sections' as const,
    label: 'Seções',
    icon: 'i-lucide-layers',
  },
  {
    value: 'visitorSituations',
    slot: 'visitorSituations' as const,
    label: 'Situações de Visitante',
    icon: 'i-lucide-user-check',
  },
];
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Banco de Dados</h1>
        <p class="text-sm text-muted mt-1">
          Visualize, adicione e remova entradas das tabelas do sistema.
        </p>
      </div>
    </div>

    <div class="grid grid-cols-4 gap-4">
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <UIcon name="i-lucide-tag" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Categorias</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ categoriesTable?.count ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-500/10">
            <UIcon name="i-lucide-award" class="text-blue-500 text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Graduações</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ graduationsTable?.count ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-green-500/10">
            <UIcon name="i-lucide-layers" class="text-green-500 text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Seções</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ sectionsTable?.count ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-purple-500/10">
            <UIcon name="i-lucide-user-check" class="text-purple-500 text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Situações</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ visitorSituationsTable?.count ?? 0 }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UTabs v-model="activeTab" :items="tabs" :ui="{ list: 'mb-4' }">
      <template #categories>
        <AdminCrudTable
          ref="categoriesTable"
          resource="categories"
          :read-only="readOnly"
          field="name"
          field-label="Nome"
          title="Categorias"
          icon="i-lucide-tag"
          placeholder="Buscar por nome..."
          example="Ex: Infraestrutura"
        />
      </template>

      <template #graduations>
        <AdminCrudTable
          ref="graduationsTable"
          resource="graduations"
          :read-only="readOnly"
          field="abbreviation"
          field-label="Abreviação"
          title="Graduações"
          icon="i-lucide-award"
          placeholder="Buscar por abreviação..."
          example="Ex: Sd"
          badge
        />
      </template>

      <template #sections>
        <AdminCrudTable
          ref="sectionsTable"
          resource="sections"
          :read-only="readOnly"
          field="name"
          field-label="Nome"
          title="Seções"
          icon="i-lucide-layers"
          placeholder="Buscar por nome..."
          example="Ex: 1ª Seção"
        />
      </template>

      <template #visitorSituations>
        <AdminCrudTable
          ref="visitorSituationsTable"
          resource="visitor-situations"
          :read-only="readOnly"
          field="name"
          field-label="Nome"
          title="Situações"
          icon="i-lucide-user-check"
          placeholder="Buscar por nome..."
          example="Ex: Civil"
        />
      </template>
    </UTabs>
  </div>
</template>
