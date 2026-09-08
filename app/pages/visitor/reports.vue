<script setup lang="ts">
import { shallowRef } from 'vue'
import type { DateValue } from '@internationalized/date'

useSeoMeta({
  title: 'Relatórios de Visitantes',
  description: 'Filtre visitas por CPF, crachá e período.',
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

const filterCpf = ref('')
const filterBadgeNumber = ref('')

type DateRange = { start: DateValue | undefined; end: DateValue | undefined }
const dateRange = shallowRef<DateRange>({ start: undefined, end: undefined })

const loading = ref(false)
const hasSearched = ref(false)
const results = ref<VisitorLog[]>([])

async function runReport() {
  loading.value = true
  hasSearched.value = true
  try {
    const params: Record<string, string> = {}
    if (filterCpf.value.trim()) params.cpf = filterCpf.value.trim()
    if (filterBadgeNumber.value.trim()) params.badgeNumber = filterBadgeNumber.value.trim()
    if (dateRange.value.start) params.dateFrom = dateValueToISO(dateRange.value.start)
    if (dateRange.value.end) params.dateTo = dateValueToISO(dateRange.value.end)

    results.value = await $fetch<VisitorLog[]>('/api/reports/visitors', { params })
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filterCpf.value = ''
  filterBadgeNumber.value = ''
  dateRange.value = { start: undefined, end: undefined }
  results.value = []
  hasSearched.value = false
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
]
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Relatórios de Visitantes</h1>
      <p class="text-sm text-muted mt-1">Filtre e consulte o histórico de visitas.</p>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-filter" class="text-muted" />
          <span class="font-semibold text-sm">Filtros</span>
        </div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UFormField label="CPF">
          <UInput v-model="filterCpf" icon="i-lucide-id-card" placeholder="000.000.000-00" class="w-full" />
        </UFormField>

        <UFormField label="Nº Crachá">
          <UInput v-model="filterBadgeNumber" icon="i-lucide-badge" placeholder="Buscar por crachá..." class="w-full" />
        </UFormField>

        <DateRangeField v-model="dateRange" class="lg:col-span-2" />
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton variant="ghost" color="neutral" label="Limpar" icon="i-lucide-x" @click="clearFilters" />
          <UButton label="Buscar" icon="i-lucide-search" :loading="loading" @click="runReport" />
        </div>
      </template>
    </UCard>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
        <p class="text-sm">Buscando...</p>
      </div>
    </div>

    <div
      v-else-if="!hasSearched"
      class="flex flex-col items-center justify-center py-20 text-center text-muted"
    >
      <UIcon name="i-lucide-bar-chart-2" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">Configure os filtros acima e clique em <strong>Buscar</strong>.</p>
    </div>

    <div
      v-else-if="results.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center text-muted"
    >
      <UIcon name="i-lucide-inbox" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">Nenhuma visita encontrada com os filtros selecionados.</p>
    </div>

    <UCard v-else :ui="{ body: 'p-0' }">
      <template #header>
        <span class="font-semibold text-sm">Resultados ({{ results.length }})</span>
      </template>
      <UTable
        :data="results"
        :columns="columns"
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
      </UTable>
    </UCard>
  </div>
</template>
