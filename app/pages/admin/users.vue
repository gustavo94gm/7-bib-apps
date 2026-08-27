<script setup lang="ts">
import { authClient } from "~~/lib/auth-client";

useSeoMeta({
  title: "Gerenciar Usuários",
  description: "Gerencie os usuários do sistema.",
});

const toast = useToast();
const router = useRouter();
const { data: session } = await authClient.useSession(useFetch);

interface SystemUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string | null;
  banned: boolean | null;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
}

const users = ref<SystemUser[]>([]);
const loadingUsers = ref(true);
const globalFilter = ref("");
const page = ref(1);
const pageSize = 10;
const totalUsers = ref(0);

async function fetchUsers() {
  loadingUsers.value = true;
  try {
    const { data, error } = await (authClient as any).admin.listUsers({
      query: {
        limit: 9999,
        offset: 0,
      },
    });

    if (error) {
      toast.add({ title: "Erro ao carregar usuários.", color: "error" });
      return;
    }

    users.value = (data?.users ?? []) as SystemUser[];
    totalUsers.value = users.value.length;
  } finally {
    loadingUsers.value = false;
  }
}

onMounted(fetchUsers);

const filteredUsers = computed(() => {
  if (!globalFilter.value.trim()) return users.value;
  const q = globalFilter.value.toLowerCase();
  return users.value.filter(
    (u) =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
  );
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredUsers.value.length / pageSize))
);

const pagedUsers = computed(() => {
  const start = (page.value - 1) * pageSize;
  return filteredUsers.value.slice(start, start + pageSize);
});

watch(globalFilter, () => {
  page.value = 1;
});

const columns = [
  { id: "user", header: "Usuário" },
  { id: "email", header: "Email" },
  { id: "role", header: "Role" },
  { id: "status", header: "Status" },
  { id: "createdAt", header: "Criado em" },
  { id: "actions", header: "Ações" },
];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

function roleBadgeColor(role: string | null) {
  if (role === "admin") return "primary";
  if (role === "rp") return "secondary";
  return "neutral";
}

function roleLabel(role: string | null) {
  if (role === "admin") return "Admin";
  if (role === "rp") return "RP";
  return "Usuário";
}

const actionLoading = ref<string | null>(null);

async function setRole(userId: string, role: "admin" | "user" | "rp") {
  actionLoading.value = userId;
  try {
    const { error } = await (authClient as any).admin.setRole({
      userId,
      role,
    });
    if (error) throw error;
    const u = users.value.find((u) => u.id === userId);
    if (u) u.role = role;
    toast.add({ title: `Role alterada para "${roleLabel(role)}".`, color: "success" });
  } catch {
    toast.add({ title: "Erro ao alterar role.", color: "error" });
  } finally {
    actionLoading.value = null;
  }
}

async function banUser(userId: string) {
  actionLoading.value = userId;
  try {
    const { error } = await (authClient as any).admin.banUser({ userId });
    if (error) throw error;
    const u = users.value.find((u) => u.id === userId);
    if (u) u.banned = true;
    toast.add({ title: "Usuário banido.", color: "warning" });
  } catch {
    toast.add({ title: "Erro ao banir usuário.", color: "error" });
  } finally {
    actionLoading.value = null;
  }
}

async function unbanUser(userId: string) {
  actionLoading.value = userId;
  try {
    const { error } = await (authClient as any).admin.unbanUser({ userId });
    if (error) throw error;
    const u = users.value.find((u) => u.id === userId);
    if (u) u.banned = false;
    toast.add({ title: "Usuário desbanido.", color: "success" });
  } catch {
    toast.add({ title: "Erro ao desbanir usuário.", color: "error" });
  } finally {
    actionLoading.value = null;
  }
}

async function revokeSessions(userId: string) {
  actionLoading.value = userId;
  try {
    const { error } = await (authClient as any).admin.revokeUserSessions({ userId });
    if (error) throw error;
    toast.add({ title: "Sessões revogadas com sucesso.", color: "success" });
  } catch {
    toast.add({ title: "Erro ao revogar sessões.", color: "error" });
  } finally {
    actionLoading.value = null;
  }
}

function getRowActions(row: SystemUser): any[][] {
  return [
    [
      {
        label: "Tornar Admin",
        icon: "i-lucide-shield",
        disabled: row.role === "admin" || row.id === session.value?.user?.id,
        onSelect: () => setRole(row.id, "admin"),
      },
      {
        label: "Tornar Usuário",
        icon: "i-lucide-user",
        disabled: row.role === "user" || row.id === session.value?.user?.id,
        onSelect: () => setRole(row.id, "user"),
      },
      {
        label: "Tornar RP",
        icon: "i-lucide-id-card",
        disabled: row.role === "rp" || row.id === session.value?.user?.id,
        onSelect: () => setRole(row.id, "rp"),
      },
    ],
    [
      {
        label: row.banned ? "Desbanir" : "Banir",
        icon: row.banned ? "i-lucide-user-check" : "i-lucide-user-x",
        color: row.banned ? "success" : "error",
        disabled: row.id === session.value?.user?.id,
        onSelect: () => (row.banned ? unbanUser(row.id) : banUser(row.id)),
      },
      {
        label: "Revogar Sessões",
        icon: "i-lucide-log-out",
        color: "warning",
        onSelect: () => revokeSessions(row.id),
      },
    ],
  ];
}

const isCreateModalOpen = ref(false);
const createForm = reactive({
  name: "",
  email: "",
  password: "",
  role: "user" as "admin" | "user" | "rp",
});
const createLoading = ref(false);

async function createUser() {
  createLoading.value = true;
  try {
    const { data, error } = await (authClient as any).admin.createUser({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      role: createForm.role,
    });
    if (error) throw error;
    toast.add({ title: "Usuário criado com sucesso!", color: "success" });
    isCreateModalOpen.value = false;
    Object.assign(createForm, { name: "", email: "", password: "", role: "user" });
    await fetchUsers();
  } catch {
    toast.add({ title: "Erro ao criar usuário.", color: "error" });
  } finally {
    createLoading.value = false;
  }
}

const roleOptions = [
  { label: "Usuário", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "RP", value: "rp" },
];
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold text-highlighted">
          Gerenciar Usuários
        </h1>
        <p class="text-sm text-muted mt-1">
          Gerencie os usuários do sistema, roles e permissões.
        </p>
      </div>
      <UButton
        icon="i-lucide-user-plus"
        label="Novo Usuário"
        @click="isCreateModalOpen = true"
      />
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-primary/10">
            <UIcon name="i-lucide-users" class="text-primary text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Total</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ users.length }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-blue-500/10">
            <UIcon name="i-lucide-shield" class="text-blue-500 text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Admins</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ users.filter((u) => u.role === "admin").length }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-green-500/10">
            <UIcon
              name="i-lucide-user-check"
              class="text-green-500 text-xl"
            />
          </div>
          <div>
            <p class="text-xs text-muted">Ativos</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ users.filter((u) => !u.banned).length }}
            </p>
          </div>
        </div>
      </UCard>
      <UCard :ui="{ body: 'p-4' }">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-lg bg-red-500/10">
            <UIcon name="i-lucide-user-x" class="text-red-500 text-xl" />
          </div>
          <div>
            <p class="text-xs text-muted">Banidos</p>
            <p class="text-2xl font-bold text-highlighted">
              {{ users.filter((u) => u.banned).length }}
            </p>
          </div>
        </div>
      </UCard>
    </div>

    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <UInput
          v-model="globalFilter"
          icon="i-lucide-search"
          placeholder="Buscar por nome, email ou role..."
          class="flex-1"
          :loading="loadingUsers"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          variant="ghost"
          color="neutral"
          :loading="loadingUsers"
          title="Recarregar"
          @click="fetchUsers"
        />
      </div>

      <UCard :ui="{ body: 'p-0' }">
        <UTable
          :data="pagedUsers"
          :columns="columns"
          :loading="loadingUsers"
          :ui="{
            thead: 'bg-elevated/50',
            th: 'font-semibold text-xs uppercase tracking-wider text-muted py-3',
            tr: 'hover:bg-elevated/30 transition-colors',
          }"
        >
          <template #user-cell="{ row }">
            <div class="flex items-center gap-3">
              <UAvatar
                :src="row.original.image ?? undefined"
                :alt="row.original.name"
                size="sm"
              />
              <span class="font-medium text-highlighted">{{
                row.original.name
              }}</span>
            </div>
          </template>

          <template #email-cell="{ row }">
            <span class="text-sm text-muted">{{ row.original.email }}</span>
          </template>
          
          <template #role-cell="{ row }">
            <UBadge
              :color="roleBadgeColor(row.original.role)"
              variant="subtle"
              size="sm"
            >
              <UIcon
                :name="
                  row.original.role === 'admin'
                    ? 'i-lucide-shield'
                    : 'i-lucide-user'
                "
                class="mr-1"
              />
              {{ roleLabel(row.original.role) }}
            </UBadge>
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :color="row.original.banned ? 'error' : 'success'"
              variant="subtle"
              size="sm"
            >
              <UIcon
                :name="
                  row.original.banned
                    ? 'i-lucide-ban'
                    : 'i-lucide-circle-check'
                "
                class="mr-1"
              />
              {{ row.original.banned ? "Banido" : "Ativo" }}
            </UBadge>
          </template>

          <template #createdAt-cell="{ row }">
            <span class="text-sm text-muted">{{
              formatDate(row.original.createdAt)
            }}</span>
          </template>

          <template #actions-cell="{ row }">
            <UDropdownMenu
              :items="getRowActions(row.original)"
              :content="{ align: 'end' }"
            >
              <UButton
                icon="i-lucide-ellipsis"
                variant="ghost"
                color="neutral"
                size="sm"
                :loading="actionLoading === row.original.id"
              />
            </UDropdownMenu>
          </template>
        </UTable>

        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between px-4 py-3 border-t border-default"
        >
          <p class="text-sm text-muted">
            {{ filteredUsers.length }} usuário{{
              filteredUsers.length !== 1 ? "s" : ""
            }}
            · Página {{ page }} de {{ totalPages }}
          </p>
          <UPagination
            v-model:page="page"
            :total="filteredUsers.length"
            :items-per-page="pageSize"
            show-edges
          />
        </div>

        <div
          v-if="!loadingUsers && filteredUsers.length === 0"
          class="flex flex-col items-center justify-center py-16 text-center"
        >
          <UIcon
            name="i-lucide-users"
            class="text-4xl text-muted mb-3"
          />
          <p class="font-medium text-highlighted">
            Nenhum usuário encontrado
          </p>
          <p class="text-sm text-muted mt-1">
            {{
              globalFilter
                ? "Tente mudar os termos de busca."
                : "Crie o primeiro usuário clicando em \"Novo Usuário\"."
            }}
          </p>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="isCreateModalOpen" :ui="{ content: 'max-w-md' }">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div>
                <h2 class="text-lg font-semibold text-highlighted">
                  Novo Usuário
                </h2>
                <p class="text-sm text-muted">
                  Crie uma nova conta de acesso ao sistema.
                </p>
              </div>
              <UButton
                icon="i-lucide-x"
                variant="ghost"
                color="neutral"
                size="sm"
                @click="isCreateModalOpen = false"
              />
            </div>
          </template>

          <form class="space-y-4" @submit.prevent="createUser">
            <UFormField label="Nome completo" required>
              <UInput
                v-model="createForm.name"
                placeholder="Nome do usuário"
                icon="i-lucide-user"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Email" required>
              <UInput
                v-model="createForm.email"
                type="email"
                placeholder="email@exemplo.com"
                icon="i-lucide-mail"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Senha" required>
              <UInput
                v-model="createForm.password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                icon="i-lucide-lock"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Role">
              <USelect
                v-model="createForm.role"
                :items="roleOptions"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                type="button"
                variant="ghost"
                color="neutral"
                label="Cancelar"
                @click="isCreateModalOpen = false"
              />
              <UButton
                type="submit"
                icon="i-lucide-user-plus"
                :loading="createLoading"
                label="Criar Usuário"
              />
            </div>
          </form>
        </UCard>
      </template>
    </UModal>
  </div>
</template>
