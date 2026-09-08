<script setup lang="ts">
import { shallowRef } from 'vue'
import type { DateValue } from '@internationalized/date'
useSeoMeta({
  title: 'Relatórios de Chamados',
  description: 'Gere relatórios filtrados de chamados com estatísticas de desempenho.',
})

interface ReportTicket {
  id: number
  title: string | null
  status: string | null
  requesterName: string | null
  createdAt: string | null
  closedAt: string | null
  category: { id: number; name: string | null } | null
  graduation: { id: number; abbreviation: string | null } | null
  section: { id: number; name: string | null } | null
}

interface ReportResult {
  summary: {
    total: number
    byStatus: { open: number; in_progress: number; closed: number }
    avgResolutionHours: number | null
  }
  byCategory: Record<string, number>
  bySection: Record<string, number>
  tickets: ReportTicket[]
}

const { categories, graduations, sections } = await useLookups()

const filterStatus = ref<string | undefined>(undefined)
const filterCategoryId = ref<number | undefined>(undefined)
const filterSectionId = ref<number | undefined>(undefined)
const filterGraduationId = ref<number | undefined>(undefined)
const filterRequester = ref('')

type DateRange = { start: DateValue | undefined; end: DateValue | undefined }
const dateRange = shallowRef<DateRange>({ start: undefined, end: undefined })

const loading = ref(false)
const reportData = ref<ReportResult | null>(null)
const hasSearched = ref(false)

const statusOptions = [
  { label: 'Todos os status', value: undefined },
  { label: 'Aberto', value: 'open' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Fechado', value: 'closed' },
]

const categoryOptions = computed(() => [
  { label: 'Todas as categorias', value: undefined },
  ...(categories.value ?? []).map(c => ({ label: c.name ?? '—', value: c.id })),
])

const sectionOptions = computed(() => [
  { label: 'Todas as seções', value: undefined },
  ...(sections.value ?? []).map(s => ({ label: s.name ?? '—', value: s.id })),
])

const graduationOptions = computed(() => [
  { label: 'Todas as graduações', value: undefined },
  ...(graduations.value ?? []).map(g => ({ label: g.abbreviation ?? '—', value: g.id })),
])

async function runReport() {
  loading.value = true
  hasSearched.value = true
  try {
    const params: Record<string, string> = {}
    if (filterStatus.value) params.status = filterStatus.value
    if (filterCategoryId.value) params.categoryId = String(filterCategoryId.value)
    if (filterSectionId.value) params.sectionId = String(filterSectionId.value)
    if (filterGraduationId.value) params.graduationId = String(filterGraduationId.value)
    if (filterRequester.value.trim()) params.requester = filterRequester.value.trim()
    if (dateRange.value.start) params.dateFrom = dateValueToISO(dateRange.value.start)
    if (dateRange.value.end) params.dateTo = dateValueToISO(dateRange.value.end)

    reportData.value = await $fetch<ReportResult>('/api/reports/tickets' as string, { params })
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filterStatus.value = undefined
  filterCategoryId.value = undefined
  filterSectionId.value = undefined
  filterGraduationId.value = undefined
  filterRequester.value = ''
  dateRange.value = { start: undefined, end: undefined }
  reportData.value = null
  hasSearched.value = false
}

function statusLabel(s: string | null) {
  if (s === 'open') return 'Aberto'
  if (s === 'in_progress') return 'Em Andamento'
  if (s === 'closed') return 'Fechado'
  return s ?? '—'
}

function statusColor(s: string | null) {
  if (s === 'open') return 'secondary'
  if (s === 'in_progress') return 'warning'
  if (s === 'closed') return 'primary'
  return 'neutral'
}

function formatHours(h: number | null) {
  if (h === null) return '—'
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  const rem = h % 24
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`
}

const sortedByCategory = computed(() =>
  Object.entries(reportData.value?.byCategory ?? {}).sort((a, b) => b[1] - a[1])
)
const sortedBySection = computed(() =>
  Object.entries(reportData.value?.bySection ?? {}).sort((a, b) => b[1] - a[1])
)
const maxCategoryCount = computed(() => sortedByCategory.value[0]?.[1] ?? 1)
const maxSectionCount = computed(() => sortedBySection.value[0]?.[1] ?? 1)

const columns = [
  { id: 'id', header: '#' },
  { id: 'title', header: 'Título' },
  { id: 'requesterName', header: 'Solicitante' },
  { id: 'category', header: 'Categoria' },
  { id: 'section', header: 'Seção' },
  { id: 'status', header: 'Status' },
  { id: 'createdAt', header: 'Abertura' },
  { id: 'closedAt', header: 'Fechamento' },
]

function exportCSV() {
  if (!reportData.value?.tickets.length) return
  const headers = ['#', 'Título', 'Solicitante', 'Graduação', 'Categoria', 'Seção', 'Status', 'Abertura', 'Fechamento']
  const rows = reportData.value.tickets.map(t => [
    t.id,
    `"${(t.title ?? '').replace(/"/g, '""')}"`,
    `"${(t.requesterName ?? '').replace(/"/g, '""')}"`,
    t.graduation?.abbreviation ?? '',
    `"${(t.category?.name ?? '').replace(/"/g, '""')}"`,
    `"${(t.section?.name ?? '').replace(/"/g, '""')}"`,
    statusLabel(t.status),
    formatDate(t.createdAt),
    formatDate(t.closedAt),
  ])
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relatorio-chamados-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">Relatórios de Chamados</h1>
        <p class="text-sm text-muted mt-1">Filtre e exporte dados dos chamados registrados no sistema.</p>
      </div>
      <UButton
        v-if="reportData"
        icon="i-lucide-download"
        variant="outline"
        color="neutral"
        label="Exportar CSV"
        @click="exportCSV"
      />
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-filter" class="text-muted" />
          <span class="font-semibold text-sm">Filtros</span>
        </div>
      </template>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <UFormField label="Status">
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            placeholder="Todos os status"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Solicitante">
          <UInput
            v-model="filterRequester"
            icon="i-lucide-user"
            placeholder="Buscar por nome..."
            class="w-full"
          />
        </UFormField>

        <UFormField label="Graduação">
          <USelect
            v-model="filterGraduationId"
            :items="graduationOptions"
            placeholder="Todas as graduações"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Categoria">
          <USelect
            v-model="filterCategoryId"
            :items="categoryOptions"
            placeholder="Todas as categorias"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Seção">
          <USelect
            v-model="filterSectionId"
            :items="sectionOptions"
            placeholder="Todas as seções"
            class="w-full"
          />
        </UFormField>

        <DateRangeField v-model="dateRange" />
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2">
          <UButton
            variant="ghost"
            color="neutral"
            label="Limpar"
            icon="i-lucide-x"
            @click="clearFilters"
          />
          <UButton
            label="Gerar Relatório"
            icon="i-lucide-bar-chart-2"
            :loading="loading"
            @click="runReport"
          />
        </div>
      </template>
    </UCard>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3 text-muted">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-4xl" />
        <p class="text-sm">Gerando relatório...</p>
      </div>
    </div>

    <div
      v-else-if="!hasSearched"
      class="flex flex-col items-center justify-center py-20 text-center text-muted"
    >
      <UIcon name="i-lucide-bar-chart-2" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">Configure os filtros acima e clique em <strong>Gerar Relatório</strong>.</p>
    </div>

    <div
      v-else-if="hasSearched && reportData?.summary.total === 0"
      class="flex flex-col items-center justify-center py-20 text-center text-muted"
    >
      <UIcon name="i-lucide-inbox" class="text-5xl mb-3 opacity-30" />
      <p class="text-sm">Nenhum chamado encontrado com os filtros selecionados.</p>
    </div>

    <template v-else-if="reportData && reportData.summary.total > 0">

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <UCard class="text-center">
          <p class="text-3xl font-bold text-highlighted">{{ reportData.summary.total }}</p>
          <p class="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">Total</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-3xl font-bold text-secondary">{{ reportData.summary.byStatus.open }}</p>
          <p class="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">Abertos</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-3xl font-bold text-warning">{{ reportData.summary.byStatus.in_progress }}</p>
          <p class="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">Em Andamento</p>
        </UCard>
        <UCard class="text-center">
          <p class="text-3xl font-bold text-primary">{{ reportData.summary.byStatus.closed }}</p>
          <p class="text-xs text-muted mt-1 uppercase tracking-wider font-semibold">Fechados</p>
        </UCard>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-tag" class="text-muted text-sm" />
              <span class="font-semibold text-sm">Por Categoria</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              v-for="[name, count] in sortedByCategory"
              :key="name"
              class="flex items-center gap-3"
            >
              <span class="text-sm text-muted w-32 shrink-0 truncate" :title="name">{{ name }}</span>
              <div class="flex-1 bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  class="h-full bg-primary rounded-full transition-all duration-500"
                  :style="{ width: `${(count / maxCategoryCount) * 100}%` }"
                />
              </div>
              <span class="text-sm font-semibold w-6 text-right shrink-0">{{ count }}</span>
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="text-muted text-sm" />
              <span class="font-semibold text-sm">Por Seção</span>
            </div>
          </template>
          <div class="space-y-3">
            <div
              v-for="[name, count] in sortedBySection"
              :key="name"
              class="flex items-center gap-3"
            >
              <span class="text-sm text-muted w-32 shrink-0 truncate" :title="name">{{ name }}</span>
              <div class="flex-1 bg-elevated rounded-full h-2 overflow-hidden">
                <div
                  class="h-full bg-secondary rounded-full transition-all duration-500"
                  :style="{ width: `${(count / maxSectionCount) * 100}%` }"
                />
              </div>
              <span class="text-sm font-semibold w-6 text-right shrink-0">{{ count }}</span>
            </div>
          </div>
        </UCard>
      </div>

      <UCard v-if="reportData.summary.avgResolutionHours !== null">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-success/10">
            <UIcon name="i-lucide-clock" class="text-success text-xl" />
          </div>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wider text-muted">Tempo médio de resolução</p>
            <p class="text-2xl font-bold text-highlighted mt-0.5">
              {{ formatHours(reportData.summary.avgResolutionHours) }}
            </p>
          </div>
          <p class="text-xs text-muted ml-auto">
            Calculado sobre {{ reportData.summary.byStatus.closed }} chamado{{ reportData.summary.byStatus.closed !== 1 ? 's' : '' }} fechado{{ reportData.summary.byStatus.closed !== 1 ? 's' : '' }}
          </p>
        </div>
      </UCard>

      <UCard :ui="{ body: 'p-0' }">
        <template #header>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-table" class="text-muted text-sm" />
              <span class="font-semibold text-sm">Chamados ({{ reportData.tickets.length }})</span>
            </div>
          </div>
        </template>
        <UTable
          :data="reportData.tickets"
          :columns="columns"
          :ui="{
            thead: 'bg-elevated/50',
            th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
          }"
        >
          <template #id-cell="{ row }">
            <span class="font-mono text-xs text-muted">#{{ row.original.id }}</span>
          </template>
          <template #title-cell="{ row }">
            <p class="max-w-xs truncate font-medium text-highlighted">{{ row.original.title ?? '—' }}</p>
          </template>
          <template #requesterName-cell="{ row }">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono bg-elevated px-1.5 py-0.5 rounded text-muted">
                {{ row.original.graduation?.abbreviation ?? '?' }}
              </span>
              <span>{{ row.original.requesterName ?? '—' }}</span>
            </div>
          </template>
          <template #category-cell="{ row }">
            <UBadge variant="subtle" color="neutral" size="sm">
              {{ row.original.category?.name ?? '—' }}
            </UBadge>
          </template>
          <template #section-cell="{ row }">
            <span class="text-sm">{{ row.original.section?.name ?? '—' }}</span>
          </template>
          <template #status-cell="{ row }">
            <UBadge :color="statusColor(row.original.status)" variant="subtle" size="sm">
              {{ statusLabel(row.original.status) }}
            </UBadge>
          </template>
          <template #createdAt-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
          </template>
          <template #closedAt-cell="{ row }">
            <span class="text-sm text-muted">{{ formatDate(row.original.closedAt) }}</span>
          </template>
        </UTable>
      </UCard>

    </template>
  </div>
</template>
