<script setup lang="ts">
interface Row {
  id: number;
  createdAt: string | null;
  [key: string]: unknown;
}

const props = defineProps<{
  resource: string;
  field: string;
  fieldLabel: string;
  title: string;
  icon: string;
  placeholder: string;
  example: string;
  badge?: boolean;
  readOnly?: boolean;
}>();

const toast = useToast();

const items = ref<Row[]>([]);
const loading = ref(false);
const search = ref('');

defineExpose({ count: computed(() => items.value.length) });

async function fetchItems() {
  loading.value = true;
  try {
    items.value = await $fetch<Row[]>(`/api/${props.resource}`);
  } catch {
    toast.add({
      title: `Erro ao carregar ${props.title.toLowerCase()}.`,
      color: 'error',
    });
  } finally {
    loading.value = false;
  }
}

onMounted(fetchItems);

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim();
  if (!q) return items.value;
  return items.value.filter((r) =>
    String(r[props.field] ?? '')
      .toLowerCase()
      .includes(q),
  );
});

const columns = computed(() => [
  { id: 'id', header: 'ID' },
  { id: props.field, header: props.fieldLabel },
  { id: 'createdAt', header: 'Criado em' },
  { id: 'actions', header: '' },
]);

const isAddOpen = ref(false);
const newValue = ref('');
const adding = ref(false);

async function addItem() {
  if (!newValue.value.trim()) return;
  adding.value = true;
  try {
    const created = await $fetch<Row>(`/api/${props.resource}`, {
      method: 'POST',
      body: { [props.field]: newValue.value.trim() },
    });
    items.value.unshift(created);
    toast.add({ title: `${props.title} adicionada!`, color: 'success' });
    isAddOpen.value = false;
    newValue.value = '';
  } catch (e: any) {
    const msg =
      e?.data?.message ?? `Erro ao adicionar ${props.title.toLowerCase()}.`;
    toast.add({ title: msg, color: 'error' });
  } finally {
    adding.value = false;
  }
}

const deleteTarget = ref<{ id: number; label: string } | null>(null);
const isDeleteOpen = ref(false);
const deleting = ref(false);

function confirmDelete(id: number, label: string) {
  deleteTarget.value = { id, label };
  isDeleteOpen.value = true;
}

async function deleteItem() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const { id } = deleteTarget.value;
  try {
    await $fetch(`/api/${props.resource}/${id}`, { method: 'DELETE' });
    items.value = items.value.filter((r) => r.id !== id);
    toast.add({ title: 'Entrada removida.', color: 'success' });
    isDeleteOpen.value = false;
  } catch {
    toast.add({ title: 'Erro ao remover entrada.', color: 'error' });
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center gap-3">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        :placeholder="placeholder"
        class="flex-1"
        :loading="loading"
      />
      <UButton
        icon="i-lucide-refresh-cw"
        variant="ghost"
        color="neutral"
        :loading="loading"
        title="Recarregar"
        @click="fetchItems"
      />
      <UButton
        v-if="!readOnly"
        icon="i-lucide-plus"
        label="Adicionar"
        @click="isAddOpen = true"
      />
    </div>

    <UCard :ui="{ body: 'p-0' }">
      <UTable
        :data="filtered"
        :columns="columns"
        :loading="loading"
        :ui="{
          thead: 'bg-elevated/50',
          th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
          tr: 'hover:bg-elevated/30 transition-colors',
        }"
      >
        <template #id-cell="{ row }">
          <span class="text-sm font-mono text-muted">{{
            row.original.id
          }}</span>
        </template>

        <template #[`${field}-cell`]="{ row }">
          <UBadge v-if="badge" variant="subtle" color="primary" size="sm">
            {{ row.original[field] ?? '—' }}
          </UBadge>
          <span v-else class="font-medium text-highlighted">{{
            row.original[field] ?? '—'
          }}</span>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm text-muted">{{
            formatDateTime(row.original.createdAt)
          }}</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex justify-end">
            <UButton
              v-if="!readOnly"
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="sm"
              aria-label="Remover"
              @click="
                confirmDelete(
                  row.original.id,
                  String(row.original[field] ?? row.original.id),
                )
              "
            />
          </div>
        </template>
      </UTable>

      <div
        v-if="!loading && filtered.length === 0"
        class="flex flex-col items-center justify-center py-14 text-center"
      >
        <UIcon :name="icon" class="text-4xl text-muted mb-3" />
        <p class="font-medium text-highlighted">
          Nenhuma {{ title.toLowerCase() }} encontrada
        </p>
        <p class="text-sm text-muted mt-1">
          {{
            search
              ? 'Tente mudar os termos de busca.'
              : `Adicione a primeira ${title.toLowerCase()}.`
          }}
        </p>
      </div>
    </UCard>

    <UModal v-model:open="isAddOpen" :ui="{ content: 'max-w-sm' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Nova {{ title.replace(/s$/, '') }}
                </h2>
                <p class="text-sm text-muted">
                  Insira {{ fieldLabel.toLowerCase() }} da nova entrada.
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                aria-label="Fechar"
                @click="isAddOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="addItem">
            <UFormField :label="fieldLabel" required>
              <UInput
                v-model="newValue"
                :placeholder="example"
                :icon="icon"
                required
                class="w-full"
                autofocus
              />
            </UFormField>
            <div class="flex justify-end gap-2 pt-1">
              <UButton
                type="button"
                variant="ghost"
                color="neutral"
                label="Cancelar"
                @click="isAddOpen = false"
              />
              <UButton
                type="submit"
                icon="i-lucide-plus"
                :loading="adding"
                label="Adicionar"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="isDeleteOpen" :ui="{ content: 'max-w-sm' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="p-2 rounded-lg bg-red-500/10">
                <UIcon
                  name="i-lucide-triangle-alert"
                  class="text-red-500 text-xl"
                />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Confirmar remoção
                </h2>
                <p class="text-sm text-muted">
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>
          </template>

          <p class="text-sm text-default mb-6">
            Tem certeza que deseja remover
            <span class="font-semibold text-highlighted">{{
              deleteTarget?.label
            }}</span
            >?
          </p>

          <div class="flex justify-end gap-2">
            <UButton
              variant="ghost"
              color="neutral"
              label="Cancelar"
              @click="isDeleteOpen = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Remover"
              :loading="deleting"
              @click="deleteItem"
            />
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
