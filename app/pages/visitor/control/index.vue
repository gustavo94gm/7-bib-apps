<script setup lang="ts">
useSeoMeta({
  title: 'Controle de Visitantes',
  description: 'Registre entradas e saídas de visitantes.',
})

interface VisitorLog {
  id: number
  cpf: string | null
  name: string | null
  badgeNumber: string | null
  destination: string | null
  situation: string | null
  visitDate: string | null
  entryTime: string | null
  exitTime: string | null
}

const toast = useToast()
const visitors = ref<VisitorLog[]>([])
const loading = ref(true)
const actionLoading = ref<number | null>(null)

async function fetchVisitors() {
  loading.value = true
  try {
    visitors.value = await $fetch<VisitorLog[]>('/api/visitors')
  } catch {
    toast.add({ title: 'Erro ao carregar visitantes.', color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(fetchVisitors)

async function registerExit(id: number) {
  actionLoading.value = id
  try {
    const exitTime = new Date().toTimeString().slice(0, 5)
    await $fetch(`/api/visitors/${id}`, { method: 'PATCH', body: { exitTime } })
    const v = visitors.value.find((v) => v.id === id)
    if (v) v.exitTime = exitTime
    toast.add({ title: 'Saída registrada.', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao registrar saída.', color: 'error' })
  } finally {
    actionLoading.value = null
  }
}

const columns = [
  { id: 'name', header: 'Nome' },
  { id: 'cpf', header: 'CPF' },
  { id: 'badgeNumber', header: 'Crachá' },
  { id: 'destination', header: 'Destino' },
  { id: 'situation', header: 'Situação' },
  { id: 'visitDate', header: 'Data' },
  { id: 'entryTime', header: 'Entrada' },
  { id: 'exitTime', header: 'Saída' },
  { id: 'actions', header: 'Ações' },
]
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Controle de Visitantes</h1>
        <p class="text-sm text-muted mt-1">Registre entradas e saídas de visitantes.</p>
      </div>
      <UButton icon="i-lucide-plus" label="Novo Registro" to="/visitor/control/register" />
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <UTable
        :data="visitors"
        :columns="columns"
        :loading="loading"
        :ui="{
          thead: 'bg-elevated/50',
          th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
        }"
      >
        <template #name-cell="{ row }">
          <span class="text-sm font-medium text-highlighted">{{ row.original.name ?? '—' }}</span>
        </template>
        <template #cpf-cell="{ row }">
          <span class="text-sm">{{ row.original.cpf ?? '—' }}</span>
        </template>
        <template #badgeNumber-cell="{ row }">
          <span class="text-sm">{{ row.original.badgeNumber ?? '—' }}</span>
        </template>
        <template #destination-cell="{ row }">
          <span class="text-sm">{{ row.original.destination ?? '—' }}</span>
        </template>
        <template #situation-cell="{ row }">
          <span class="text-sm">{{ formatSituation(row.original.situation) }}</span>
        </template>
        <template #visitDate-cell="{ row }">
          <span class="text-sm text-muted">{{ formatDateOnly(row.original.visitDate) }}</span>
        </template>
        <template #entryTime-cell="{ row }">
          <span class="text-sm">{{ formatTime(row.original.entryTime) }}</span>
        </template>
        <template #exitTime-cell="{ row }">
          <UBadge v-if="!row.original.exitTime" color="warning" variant="subtle" size="sm">
            Em andamento
          </UBadge>
          <span v-else class="text-sm">{{ formatTime(row.original.exitTime) }}</span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            v-if="!row.original.exitTime"
            label="Registrar saída"
            size="xs"
            color="neutral"
            variant="outline"
            :loading="actionLoading === row.original.id"
            @click="registerExit(row.original.id)"
          />
        </template>
      </UTable>

      <div
        v-if="!loading && visitors.length === 0"
        class="flex flex-col items-center justify-center py-16 text-center"
      >
        <UIcon name="i-lucide-users" class="text-4xl text-muted mb-3" />
        <p class="font-medium text-highlighted">Nenhum visitante registrado</p>
        <p class="text-sm text-muted mt-1">Clique em "Novo Registro" para registrar uma entrada.</p>
      </div>
    </UCard>
  </div>
</template>
