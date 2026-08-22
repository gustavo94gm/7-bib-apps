<script setup lang="ts">
useSeoMeta({
  title: "Banco de Dados",
  description: "Visualize, adicione e remova entradas das tabelas do sistema.",
});

const toast = useToast();

interface Category {
  id: number;
  name: string | null;
  createdAt: string | null;
}

interface Graduation {
  id: number;
  abbreviation: string | null;
  createdAt: string | null;
}

interface Section {
  id: number;
  name: string | null;
  createdAt: string | null;
}

const activeTab = ref("categories");

const categories = ref<Category[]>([]);
const graduations = ref<Graduation[]>([]);
const sections = ref<Section[]>([]);

const loadingCategories = ref(false);
const loadingGraduations = ref(false);
const loadingSections = ref(false);

const searchCategories = ref("");
const searchGraduations = ref("");
const searchSections = ref("");

async function fetchCategories() {
  loadingCategories.value = true;
  try {
    categories.value = await $fetch<Category[]>("/api/categories");
  } catch {
    toast.add({ title: "Erro ao carregar categorias.", color: "error" });
  } finally {
    loadingCategories.value = false;
  }
}

async function fetchGraduations() {
  loadingGraduations.value = true;
  try {
    graduations.value = await $fetch<Graduation[]>("/api/graduations");
  } catch {
    toast.add({ title: "Erro ao carregar graduações.", color: "error" });
  } finally {
    loadingGraduations.value = false;
  }
}

async function fetchSections() {
  loadingSections.value = true;
  try {
    sections.value = await $fetch<Section[]>("/api/sections");
  } catch {
    toast.add({ title: "Erro ao carregar seções.", color: "error" });
  } finally {
    loadingSections.value = false;
  }
}

onMounted(() => {
  fetchCategories();
  fetchGraduations();
  fetchSections();
});

const filteredCategories = computed(() => {
  const q = searchCategories.value.toLowerCase().trim();
  if (!q) return categories.value;
  return categories.value.filter((c) => c.name?.toLowerCase().includes(q));
});

const filteredGraduations = computed(() => {
  const q = searchGraduations.value.toLowerCase().trim();
  if (!q) return graduations.value;
  return graduations.value.filter((g) =>
    g.abbreviation?.toLowerCase().includes(q)
  );
});

const filteredSections = computed(() => {
  const q = searchSections.value.toLowerCase().trim();
  if (!q) return sections.value;
  return sections.value.filter((s) => s.name?.toLowerCase().includes(q));
});

const categoryColumns = [
  { id: "id", header: "ID" },
  { id: "name", header: "Nome" },
  { id: "createdAt", header: "Criado em" },
  { id: "actions", header: "" },
];

const graduationColumns = [
  { id: "id", header: "ID" },
  { id: "abbreviation", header: "Abreviação" },
  { id: "createdAt", header: "Criado em" },
  { id: "actions", header: "" },
];

const sectionColumns = [
  { id: "id", header: "ID" },
  { id: "name", header: "Nome" },
  { id: "createdAt", header: "Criado em" },
  { id: "actions", header: "" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

const isAddCategoryOpen = ref(false);
const newCategoryName = ref("");
const addingCategory = ref(false);

async function addCategory() {
  if (!newCategoryName.value.trim()) return;
  addingCategory.value = true;
  try {
    const created = await $fetch<Category>("/api/categories", {
      method: "POST",
      body: { name: newCategoryName.value.trim() },
    });
    categories.value.unshift(created);
    toast.add({ title: "Categoria adicionada!", color: "success" });
    isAddCategoryOpen.value = false;
    newCategoryName.value = "";
  } catch (e: any) {
    const msg = e?.data?.message ?? "Erro ao adicionar categoria.";
    toast.add({ title: msg, color: "error" });
  } finally {
    addingCategory.value = false;
  }
}

const isAddGraduationOpen = ref(false);
const newGraduationAbbreviation = ref("");
const addingGraduation = ref(false);

async function addGraduation() {
  if (!newGraduationAbbreviation.value.trim()) return;
  addingGraduation.value = true;
  try {
    const created = await $fetch<Graduation>("/api/graduations", {
      method: "POST",
      body: { abbreviation: newGraduationAbbreviation.value.trim() },
    });
    graduations.value.unshift(created);
    toast.add({ title: "Graduação adicionada!", color: "success" });
    isAddGraduationOpen.value = false;
    newGraduationAbbreviation.value = "";
  } catch (e: any) {
    const msg = e?.data?.message ?? "Erro ao adicionar graduação.";
    toast.add({ title: msg, color: "error" });
  } finally {
    addingGraduation.value = false;
  }
}

const isAddSectionOpen = ref(false);
const newSectionName = ref("");
const addingSection = ref(false);

async function addSection() {
  if (!newSectionName.value.trim()) return;
  addingSection.value = true;
  try {
    const created = await $fetch<Section>("/api/sections", {
      method: "POST",
      body: { name: newSectionName.value.trim() },
    });
    sections.value.unshift(created);
    toast.add({ title: "Seção adicionada!", color: "success" });
    isAddSectionOpen.value = false;
    newSectionName.value = "";
  } catch (e: any) {
    const msg = e?.data?.message ?? "Erro ao adicionar seção.";
    toast.add({ title: msg, color: "error" });
  } finally {
    addingSection.value = false;
  }
}

const deleteTarget = ref<{ table: string; id: number; label: string } | null>(null);
const isDeleteOpen = ref(false);
const deleting = ref(false);

function confirmDelete(table: string, id: number, label: string) {
  deleteTarget.value = { table, id, label };
  isDeleteOpen.value = true;
}

async function deleteEntry() {
  if (!deleteTarget.value) return;
  deleting.value = true;
  const { table, id } = deleteTarget.value;
  try {
    await $fetch(`/api/${table}/${id}`, { method: "DELETE" });
    if (table === "categories") {
      categories.value = categories.value.filter((c) => c.id !== id);
    } else if (table === "graduations") {
      graduations.value = graduations.value.filter((g) => g.id !== id);
    } else if (table === "sections") {
      sections.value = sections.value.filter((s) => s.id !== id);
    }
    toast.add({ title: "Entrada removida.", color: "success" });
    isDeleteOpen.value = false;
  } catch {
    toast.add({ title: "Erro ao remover entrada.", color: "error" });
  } finally {
    deleting.value = false;
  }
}

const tabs = [
  { value: "categories", slot: "categories" as const, label: "Categorias", icon: "i-lucide-tag" },
  { value: "graduations", slot: "graduations" as const, label: "Graduações", icon: "i-lucide-award" },
  { value: "sections", slot: "sections" as const, label: "Seções", icon: "i-lucide-layers" },
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

    <div class="grid grid-cols-3 gap-4">
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <UIcon name="i-lucide-tag" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Categorias</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ categories.length }}
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
              {{ graduations.length }}
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
              {{ sections.length }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <UTabs
      v-model="activeTab"
      :items="tabs"
      :ui="{ list: 'mb-4' }"
    >
      <template #categories>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchCategories"
              icon="i-lucide-search"
              placeholder="Buscar por nome..."
              class="flex-1"
              :loading="loadingCategories"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              color="neutral"
              :loading="loadingCategories"
              title="Recarregar"
              @click="fetchCategories"
            />
            <UButton
              icon="i-lucide-plus"
              label="Adicionar"
              @click="isAddCategoryOpen = true"
            />
          </div>

          <UCard :ui="{ body: 'p-0' }">
            <UTable
              :data="filteredCategories"
              :columns="categoryColumns"
              :loading="loadingCategories"
              :ui="{
                thead: 'bg-elevated/50',
                th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
                tr: 'hover:bg-elevated/30 transition-colors',
              }"
            >
              <template #id-cell="{ row }">
                <span class="text-sm font-mono text-muted">{{ row.original.id }}</span>
              </template>

              <template #name-cell="{ row }">
                <span class="font-medium text-highlighted">{{ row.original.name ?? "—" }}</span>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex justify-end">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="sm"
                    @click="confirmDelete('categories', row.original.id, row.original.name ?? String(row.original.id))"
                  />
                </div>
              </template>
            </UTable>

            <div
              v-if="!loadingCategories && filteredCategories.length === 0"
              class="flex flex-col items-center justify-center py-14 text-center"
            >
              <UIcon name="i-lucide-tag" class="text-4xl text-muted mb-3" />
              <p class="font-medium text-highlighted">Nenhuma categoria encontrada</p>
              <p class="text-sm text-muted mt-1">
                {{ searchCategories ? "Tente mudar os termos de busca." : "Adicione a primeira categoria." }}
              </p>
            </div>
          </UCard>
        </div>
      </template>

      <template #graduations>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchGraduations"
              icon="i-lucide-search"
              placeholder="Buscar por abreviação..."
              class="flex-1"
              :loading="loadingGraduations"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              color="neutral"
              :loading="loadingGraduations"
              title="Recarregar"
              @click="fetchGraduations"
            />
            <UButton
              icon="i-lucide-plus"
              label="Adicionar"
              @click="isAddGraduationOpen = true"
            />
          </div>

          <UCard :ui="{ body: 'p-0' }">
            <UTable
              :data="filteredGraduations"
              :columns="graduationColumns"
              :loading="loadingGraduations"
              :ui="{
                thead: 'bg-elevated/50',
                th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
                tr: 'hover:bg-elevated/30 transition-colors',
              }"
            >
              <template #id-cell="{ row }">
                <span class="text-sm font-mono text-muted">{{ row.original.id }}</span>
              </template>

              <template #abbreviation-cell="{ row }">
                <UBadge variant="subtle" color="primary" size="sm">
                  {{ row.original.abbreviation ?? "—" }}
                </UBadge>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex justify-end">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="sm"
                    @click="confirmDelete('graduations', row.original.id, row.original.abbreviation ?? String(row.original.id))"
                  />
                </div>
              </template>
            </UTable>

            <div
              v-if="!loadingGraduations && filteredGraduations.length === 0"
              class="flex flex-col items-center justify-center py-14 text-center"
            >
              <UIcon name="i-lucide-award" class="text-4xl text-muted mb-3" />
              <p class="font-medium text-highlighted">Nenhuma graduação encontrada</p>
              <p class="text-sm text-muted mt-1">
                {{ searchGraduations ? "Tente mudar os termos de busca." : "Adicione a primeira graduação." }}
              </p>
            </div>
          </UCard>
        </div>
      </template>

      <template #sections>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchSections"
              icon="i-lucide-search"
              placeholder="Buscar por nome..."
              class="flex-1"
              :loading="loadingSections"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              variant="ghost"
              color="neutral"
              :loading="loadingSections"
              title="Recarregar"
              @click="fetchSections"
            />
            <UButton
              icon="i-lucide-plus"
              label="Adicionar"
              @click="isAddSectionOpen = true"
            />
          </div>

          <UCard :ui="{ body: 'p-0' }">
            <UTable
              :data="filteredSections"
              :columns="sectionColumns"
              :loading="loadingSections"
              :ui="{
                thead: 'bg-elevated/50',
                th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
                tr: 'hover:bg-elevated/30 transition-colors',
              }"
            >
              <template #id-cell="{ row }">
                <span class="text-sm font-mono text-muted">{{ row.original.id }}</span>
              </template>

              <template #name-cell="{ row }">
                <span class="font-medium text-highlighted">{{ row.original.name ?? "—" }}</span>
              </template>

              <template #createdAt-cell="{ row }">
                <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
              </template>

              <template #actions-cell="{ row }">
                <div class="flex justify-end">
                  <UButton
                    icon="i-lucide-trash-2"
                    variant="ghost"
                    color="error"
                    size="sm"
                    @click="confirmDelete('sections', row.original.id, row.original.name ?? String(row.original.id))"
                  />
                </div>
              </template>
            </UTable>

            <div
              v-if="!loadingSections && filteredSections.length === 0"
              class="flex flex-col items-center justify-center py-14 text-center"
            >
              <UIcon name="i-lucide-layers" class="text-4xl text-muted mb-3" />
              <p class="font-medium text-highlighted">Nenhuma seção encontrada</p>
              <p class="text-sm text-muted mt-1">
                {{ searchSections ? "Tente mudar os termos de busca." : "Adicione a primeira seção." }}
              </p>
            </div>
          </UCard>
        </div>
      </template>
    </UTabs>

    <UModal v-model:open="isAddCategoryOpen" :ui="{ content: 'max-w-sm' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Nova Categoria</h2>
                <p class="text-sm text-muted">Insira o nome da nova categoria.</p>
              </div>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="isAddCategoryOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="addCategory">
            <UFormField label="Nome" required>
              <UInput
                v-model="newCategoryName"
                placeholder="Ex: Infraestrutura"
                icon="i-lucide-tag"
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
                @click="isAddCategoryOpen = false"
              />
              <UButton
                type="submit"
                icon="i-lucide-plus"
                :loading="addingCategory"
                label="Adicionar"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="isAddGraduationOpen" :ui="{ content: 'max-w-sm' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Nova Graduação</h2>
                <p class="text-sm text-muted">Insira a abreviação da graduação.</p>
              </div>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="isAddGraduationOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="addGraduation">
            <UFormField label="Abreviação" required>
              <UInput
                v-model="newGraduationAbbreviation"
                placeholder="Ex: Sd"
                icon="i-lucide-award"
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
                @click="isAddGraduationOpen = false"
              />
              <UButton
                type="submit"
                icon="i-lucide-plus"
                :loading="addingGraduation"
                label="Adicionar"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>

    <UModal v-model:open="isAddSectionOpen" :ui="{ content: 'max-w-sm' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Nova Seção</h2>
                <p class="text-sm text-muted">Insira o nome da nova seção.</p>
              </div>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="isAddSectionOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="addSection">
            <UFormField label="Nome" required>
              <UInput
                v-model="newSectionName"
                placeholder="Ex: 1ª Seção"
                icon="i-lucide-layers"
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
                @click="isAddSectionOpen = false"
              />
              <UButton
                type="submit"
                icon="i-lucide-plus"
                :loading="addingSection"
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
                <UIcon name="i-lucide-triangle-alert" class="text-red-500 text-xl" />
              </div>
              <div>
                <h2 class="text-lg font-semibold text-highlighted">Confirmar remoção</h2>
                <p class="text-sm text-muted">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
          </template>

          <p class="text-sm text-default mb-6">
            Tem certeza que deseja remover
            <span class="font-semibold text-highlighted">{{ deleteTarget?.label }}</span>?
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
              @click="deleteEntry"
            />
          </div>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
