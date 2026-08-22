<script setup lang="ts">
import { authClient } from '~~/lib/auth-client'

useSeoMeta({
  title: 'Lista de Chamados',
  description: 'Gerencie todos os chamados abertos no sistema.',
})

interface Ticket {
  id: number
  title: string | null
  description: string | null
  status: string | null
  requesterName: string | null
  createdAt: string | null
  updatedAt: string | null
  closedAt: string | null
  category: { id: number; name: string | null } | null
  graduation: { id: number; abbreviation: string | null } | null
  section: { id: number; name: string | null } | null
}

interface TicketDetail extends Ticket {
  assignees: { userId: string; userName: string | null; userEmail: string; userImage: string | null }[]
  comments: { id: number; authorId: string | null; authorName: string | null; content: string | null; createdAt: string | null }[]
}

interface SystemUser {
  id: string
  name: string
  email: string
  image: string | null
}

const { data: session } = await authClient.useSession(useFetch);

const { data: allTickets, refresh: refreshTickets, pending: loadingTickets } = await useFetch<Ticket[]>('/api/tickets')
const { data: systemUsers } = await useFetch<SystemUser[]>('/api/users')

const TAB_STATUSES = ['open', 'in_progress', 'closed'] as const
type TabStatus = typeof TAB_STATUSES[number]
const tabItems = [
  { label: 'Abertos', slot: 'open' as const, value: 'open', icon: 'i-lucide-inbox' },
  { label: 'Em Andamento', slot: 'in_progress' as const, value: 'in_progress', icon: 'i-lucide-clock' },
  { label: 'Fechados', slot: 'closed' as const, value: 'closed', icon: 'i-lucide-check-circle' },
]
const activeTabIndex = ref<TabStatus>('open')
const activeStatus = computed(() => activeTabIndex.value)

const globalFilter = ref('')
const page = ref(1)
const pageSize = 10

const filteredTickets = computed(() => {
  let list = (allTickets.value ?? []).filter(t => t.status === activeStatus.value)
  if (globalFilter.value.trim()) {
    const q = globalFilter.value.toLowerCase()
    list = list.filter(t =>
      t.title?.toLowerCase().includes(q) ||
      t.requesterName?.toLowerCase().includes(q) ||
      t.category?.name?.toLowerCase().includes(q) ||
      t.section?.name?.toLowerCase().includes(q)
    )
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredTickets.value.length / pageSize)))

const pagedTickets = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredTickets.value.slice(start, start + pageSize)
})

watch([activeTabIndex, globalFilter], () => { page.value = 1 })

const columns = [
  { id: 'id', header: '#' },
  { id: 'title', header: 'Título' },
  { id: 'requesterName', header: 'Solicitante' },
  { id: 'category', header: 'Categoria' },
  { id: 'section', header: 'Seção' },
  { id: 'createdAt', header: 'Data' },
  { id: 'actions', header: 'Ações' },
]

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(d))
}

function statusBadgeColor(status: string | null) {
  if (status === 'open') return 'secondary'
  if (status === 'in_progress') return 'warning'
  if (status === 'closed') return 'primary'
  return 'neutral'
}

function statusLabel(status: string | null) {
  if (status === 'open') return 'Aberto'
  if (status === 'in_progress') return 'Em Andamento'
  if (status === 'closed') return 'Fechado'
  return status ?? '—'
}

const isModalOpen = ref(false)
const selectedTicket = ref<TicketDetail | null>(null)
const loadingDetail = ref(false)

async function openTicketDetail(ticket: Ticket) {
  isModalOpen.value = true
  loadingDetail.value = true
  selectedTicket.value = null
  try {
    const data = await $fetch<TicketDetail>(`/api/tickets/${ticket.id}`)
    selectedTicket.value = data
  } finally {
    loadingDetail.value = false
  }
}

const selectedUserId = ref<string | undefined>(undefined)
const addingAssignee = ref(false)
const toast = useToast()

const assigneeUserOptions = computed(() =>
  (systemUsers.value ?? [])
    .filter(u => !selectedTicket.value?.assignees.some(a => a.userId === u.id))
    .map(u => ({ label: u.name, value: u.id }))
)

async function addAssignee() {
  if (!selectedTicket.value || !selectedUserId.value) return
  addingAssignee.value = true
  try {
    const result = await $fetch(`/api/tickets/${selectedTicket.value.id}/assignees` as string, {
      method: 'POST',
      body: { userId: selectedUserId.value },
    }) as { userId: string; userName: string | null; userEmail: string; userImage: string | null }
    selectedTicket.value.assignees.push(result)
    selectedUserId.value = undefined
    toast.add({ title: 'Responsável adicionado!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao adicionar responsável.', color: 'error' })
  } finally {
    addingAssignee.value = false
  }
}

async function removeAssignee(userId: string) {
  if (!selectedTicket.value) return
  try {
    await $fetch(`/api/tickets/${selectedTicket.value.id}/assignees?userId=${userId}` as string, {
      method: 'DELETE',
    })
    selectedTicket.value.assignees = selectedTicket.value.assignees.filter(a => a.userId !== userId)
    toast.add({ title: 'Responsável removido.', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao remover responsável.', color: 'error' })
  }
}

const newComment = ref('')
const addingComment = ref(false)
const changingStatus = ref(false)

const statusOptions = [
  { label: 'Aberto', value: 'open' },
  { label: 'Em Andamento', value: 'in_progress' },
  { label: 'Fechado', value: 'closed' },
]

async function updateStatus(newStatus: string) {
  if (!selectedTicket.value || newStatus === selectedTicket.value.status) return
  changingStatus.value = true
  try {
    const result = await $fetch(`/api/tickets/${selectedTicket.value.id}` as string, {
      method: 'PATCH',
      body: { status: newStatus },
    }) as { id: number; status: string | null; closedAt: string | null; updatedAt: string | null }
    selectedTicket.value.status = result.status
    selectedTicket.value.closedAt = result.closedAt
    selectedTicket.value.updatedAt = result.updatedAt
    const ticket = allTickets.value?.find(t => t.id === result.id)
    if (ticket) {
      ticket.status = result.status
      ticket.closedAt = result.closedAt
      ticket.updatedAt = result.updatedAt
    }
    if (result.status && TAB_STATUSES.includes(result.status as TabStatus)) {
      activeTabIndex.value = result.status as TabStatus
    }
    toast.add({ title: 'Status atualizado!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao atualizar status.', color: 'error' })
  } finally {
    changingStatus.value = false
  }
}

async function addComment() {
  if (!selectedTicket.value || !newComment.value.trim()) return
  addingComment.value = true
  try {
    const result = await $fetch(`/api/tickets/${selectedTicket.value.id}/comments`, {
      method: 'POST',
      body: { content: newComment.value },
    }) as { id: number; authorId: string | null; authorName: string | null; content: string | null; createdAt: string | null }
    selectedTicket.value.comments.push(result)
    newComment.value = ''
    toast.add({ title: 'Comentário adicionado!', color: 'success' })
  } catch {
    toast.add({ title: 'Erro ao adicionar comentário.', color: 'error' })
  } finally {
    addingComment.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Lista de Chamados</h1>
      <p class="text-sm text-muted mt-1">Gerencie todos os chamados registrados no sistema.</p>
    </div>

    <UTabs
      v-model="activeTabIndex"
      :items="tabItems"
      color="neutral"
    >
      <template v-for="tab in tabItems" #[tab.slot]="" :key="tab.slot">
        <div class="mt-4 space-y-3">
          <div class="flex items-center gap-3">
            <UInput
              v-model="globalFilter"
              icon="i-lucide-search"
              placeholder="Buscar por título, solicitante, categoria..."
              class="flex-1"
              :loading="loadingTickets"
            />
            <UBadge variant="subtle" color="neutral" size="lg">
              {{ filteredTickets.length }} chamado{{ filteredTickets.length !== 1 ? 's' : '' }}
            </UBadge>
          </div>

          <UCard :ui="{ body: 'p-0' }">
            <UTable
              :data="pagedTickets"
              :columns="columns"
              :loading="loadingTickets"
              :ui="{
                thead: 'bg-elevated/50',
                th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
                tr: 'hover:bg-elevated/30 transition-colors cursor-pointer',
              }"
            >

              <template #id-cell="{ row }">
                <span class="font-mono text-xs text-muted">#{{ row.original.id }}</span>
              </template>
              <template #title-cell="{ row }">
                <div class="max-w-xs">
                  <p class="font-medium text-highlighted truncate">{{ row.original.title ?? '—' }}</p>
                </div>
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

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <UButton
                  icon="i-lucide-eye"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  label="Visualizar"
                  @click.stop="openTicketDetail(row.original)"
                />
              </template>
            </UTable>

            <div
              v-if="totalPages > 1"
              class="flex items-center justify-between px-4 py-3 border-t border-default"
            >
              <p class="text-sm text-muted">
                Página {{ page }} de {{ totalPages }}
              </p>
              <UPagination
                v-model:page="page"
                :total="filteredTickets.length"
                :items-per-page="pageSize"
                show-edges
              />
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <UModal
      v-model:open="isModalOpen"
      :ui="{ content: 'max-w-3xl' }"
    >
      <template #content>
        <div v-if="loadingDetail" class="flex items-center justify-center py-16">
          <UIcon name="i-lucide-loader-circle" class="animate-spin text-3xl text-muted" />
        </div>

        <template v-else-if="selectedTicket">
          <UCard :ui="{ header: 'pb-6' }">
            <template #header>
              <div class="flex items-start justify-between gap-4">
                <div class="space-y-1 flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-mono text-xs text-muted">#{{ selectedTicket.id }}</span>
                    <USelect
                      :model-value="selectedTicket.status ?? 'open'"
                      :items="statusOptions"
                      :loading="changingStatus"
                      size="xs"
                      class="w-36"
                      @update:model-value="updateStatus"
                    />
                  </div>
                  <h2 class="text-xl font-semibold text-highlighted leading-tight">
                    {{ selectedTicket.title }}
                  </h2>
                  <p class="text-xs text-muted">
                    Aberto em {{ formatDate(selectedTicket.createdAt) }}
                    <template v-if="selectedTicket.closedAt">
                      · Fechado em {{ formatDate(selectedTicket.closedAt) }}
                    </template>
                  </p>
                </div>
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="sm"
                  @click="isModalOpen = false"
                />
              </div>
            </template>

            <div class="space-y-6 py-2">

              <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Solicitante</p>
                  <div class="flex items-center gap-1.5">
                    <span class="font-mono text-xs bg-elevated px-1.5 py-0.5 rounded text-muted">
                      {{ selectedTicket.graduation?.abbreviation ?? '?' }}
                    </span>
                    <span class="text-sm font-medium">{{ selectedTicket.requesterName }}</span>
                  </div>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Seção</p>
                  <p class="text-sm">{{ selectedTicket.section?.name ?? '—' }}</p>
                </div>
                <div>
                  <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Categoria</p>
                  <UBadge variant="subtle" color="neutral" size="sm">
                    {{ selectedTicket.category?.name ?? '—' }}
                  </UBadge>
                </div>
              </div>

              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Descrição</p>
                <div class="bg-elevated/50 rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap border border-default">
                  {{ selectedTicket.description || 'Sem descrição.' }}
                </div>
              </div>

              <USeparator />

              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Responsáveis</p>

                <div v-if="selectedTicket.assignees.length > 0" class="flex flex-wrap gap-2 mb-3">
                  <div
                    v-for="assignee in selectedTicket.assignees"
                    :key="assignee.userId"
                    class="flex items-center gap-2 bg-elevated border border-default rounded-full pl-1 pr-3 py-1"
                  >
                    <UAvatar
                      :src="assignee.userImage ?? undefined"
                      :alt="assignee.userName ?? assignee.userEmail"
                      size="xs"
                    />
                    <span class="text-sm font-medium">{{ assignee.userName ?? assignee.userEmail }}</span>
                    <button
                      class="text-muted hover:text-error transition-colors ml-1"
                      title="Remover responsável"
                      @click="removeAssignee(assignee.userId)"
                    >
                      <UIcon name="i-lucide-x" class="text-xs" />
                    </button>
                  </div>
                </div>

                <p v-else class="text-sm text-muted italic mb-3">Nenhum responsável atribuído.</p>

                <div class="flex items-center gap-2">
                  <USelect
                    v-model="selectedUserId"
                    :items="assigneeUserOptions"
                    placeholder="Adicionar responsável..."
                    class="flex-1"
                  />
                  <UButton
                    icon="i-lucide-user-plus"
                    :loading="addingAssignee"
                    :disabled="!selectedUserId"
                    label="Adicionar"
                    @click="addAssignee"
                  />
                </div>
              </div>

              <USeparator />

              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                  Comentários ({{ selectedTicket.comments.length }})
                </p>

                <div class="space-y-3 mb-4">
                  <div
                    v-if="selectedTicket.comments.length === 0"
                    class="text-sm text-muted italic text-center py-6 bg-elevated/30 rounded-lg border border-dashed border-default"
                  >
                    Chamado sem comentários.
                  </div>

                  <div
                    v-for="comment in selectedTicket.comments"
                    :key="comment.id"
                    class="flex gap-3"
                  >
                    <UAvatar
                      :alt="comment.authorName ?? 'Anônimo'"
                      size="sm"
                      class="shrink-0 mt-0.5"
                    />
                    <div class="flex-1 bg-elevated/50 rounded-lg px-4 py-3 border border-default">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-semibold">{{ comment.authorName ?? 'Anônimo' }}</span>
                        <span class="text-xs text-muted">{{ formatDate(comment.createdAt) }}</span>
                      </div>
                      <p class="text-sm leading-relaxed whitespace-pre-wrap">{{ comment.content }}</p>
                    </div>
                  </div>
                </div>

                <div v-if="session?.user" class="space-y-2">
                  <div class="flex gap-3">
                    <UAvatar
                      :src="session.user.image ?? undefined"
                      :alt="session.user.name"
                      size="sm"
                      class="shrink-0 mt-1"
                    />
                    <UTextarea
                      v-model="newComment"
                      placeholder="Escreva um comentário..."
                      :rows="3"
                      class="flex-1"
                    />
                  </div>
                  <div class="flex justify-end">
                    <UButton
                      icon="i-lucide-send"
                      :loading="addingComment"
                      :disabled="!newComment.trim()"
                      label="Comentar"
                      @click="addComment"
                    />
                  </div>
                </div>

                <div v-else class="text-sm text-muted italic text-center py-3 bg-elevated/30 rounded-lg border border-dashed border-default">
                  Faça login para comentar.
                </div>
              </div>
            </div>
          </UCard>
        </template>
      </template>
    </UModal>
  </div>
</template>
