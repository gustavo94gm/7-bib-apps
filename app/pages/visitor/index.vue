<script setup lang="ts">
useSeoMeta({
  title: 'Controle de Visitantes',
  description: 'Sistema de controle de visitantes do 7º Batalhão de Infantaria Blindado.',
})

const actions = [
  {
    label: 'Controle de Visitantes',
    description: 'Registre entradas e saídas de visitantes.',
    icon: 'i-lucide-clipboard-list',
    to: '/visitor/control',
  },
  {
    label: 'Relatórios',
    description: 'Consulte visitas por CPF, crachá ou período.',
    icon: 'i-lucide-bar-chart-2',
    to: '/visitor/reports',
  },
]
</script>

<template>
  <div class="space-y-8">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Bem-vindo ao sistema de controle de visitantes
      </h1>
      <p class="text-sm text-muted mt-1">7º Batalhão de Infantaria Blindado</p>
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
