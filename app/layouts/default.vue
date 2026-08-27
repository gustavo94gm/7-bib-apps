<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from "@nuxt/ui";
import { authClient, signOut } from "~~/lib/auth-client";

const open = useCookie("sidebar-open", { default: () => true });

const colorMode = useColorMode();
const router = useRouter();

const { data: session } = await authClient.useSession(useFetch);

const displayUser = computed(() => ({
  name: session.value?.user?.name ?? "Usuário",
  avatar: {
    src: session.value?.user?.image ?? undefined,
    alt: session.value?.user?.name ?? "Usuário",
  },
}));

function getItems(state: "collapsed" | "expanded") {
  return [
    {
      label: "Chamados",
      icon: "i-lucide-inbox",
      defaultOpen: true,
      children:
        state === "expanded"
          ? [
              {
                label: "Criar Chamado",
                icon: "i-lucide-plus",
                to: "/tickets/new",
              },
              {
                label: "Lista de Chamados",
                icon: "i-lucide-list",
                to: "/tickets/list",
              },
            ]
          : [],
    },
    {
      label: "Visitantes",
      icon: "i-lucide-id-card",
      children:
        state === "expanded"
          ? [
              {
                label: "Início",
                icon: "i-lucide-home",
                to: "/visitor",
              },
              {
                label: "Controle de Visitantes",
                icon: "i-lucide-clipboard-list",
                to: "/visitor/control",
              },
              {
                label: "Relatórios",
                icon: "i-lucide-bar-chart-2",
                to: "/visitor/reports",
              },
            ]
          : [],
    },
    {
      label: "Administração",
      icon: "i-lucide-settings",
      children:
        state === "expanded"
          ? [
              {
                label: "Gerar Relatórios",
                icon: "i-lucide-chart-line",
                to: "/admin/reports",
              },
              {
                label: "Gerenciar usuários",
                icon: "i-lucide-users",
                to: "/admin/users",
              },
              {
                label: "Banco de dados",
                icon: "i-lucide-table",
                to: "/admin/database",
              },
            ]
          : [],
    },
  ] satisfies NavigationMenuItem[];
}

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: "Tema",
      icon: "i-lucide-sun-moon",
      children: [
        {
          label: "Claro",
          icon: "i-lucide-sun",
          type: "checkbox",
          checked: colorMode.value === "light",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = "light";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
        {
          label: "Escuro",
          icon: "i-lucide-moon",
          type: "checkbox",
          checked: colorMode.value === "dark",
          onUpdateChecked(checked: boolean) {
            if (checked) {
              colorMode.preference = "dark";
            }
          },
          onSelect(e: Event) {
            e.preventDefault();
          },
        },
      ],
    },
  ],
  [
    {
      label: "Log out",
      icon: "i-lucide-log-out",
      async onSelect() {
        await signOut();
        router.push("/admin/auth");
      },
    },
  ],
]);
</script>

<template>
  <div class="flex flex-1">
    <USidebar v-model:open="open" collapsible="offcanvas" rail>
      <template #header>
        <img src="../assets/logo7bib.jpg" class="w-10 rounded-2xl" />
        <USeparator orientation="vertical" />
        <p>Desenvolvido por Sd Ev Gustavo Mueller</p>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="getItems(state)"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden' }"
        />
      </template>

      <template #footer>
        <UDropdownMenu
          :items="userItems"
          :content="{ align: 'center', collisionPadding: 12 }"
          :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width) min-w-48' }"
        >
          <UButton
            v-bind="displayUser"
            :label="displayUser?.name"
            trailing-icon="i-lucide-chevrons-up-down"
            color="neutral"
            variant="ghost"
            square
            class="w-full data-[state=open]:bg-elevated overflow-hidden"
            :ui="{
              trailingIcon: 'text-dimmed ms-auto',
            }"
          />
        </UDropdownMenu>
      </template>
    </USidebar>

    <div class="flex-1 flex flex-col">
      <div
        class="h-(--ui-header-height) shrink-0 flex items-center px-4 border-b border-default"
      >
        <UButton
          icon="i-lucide-panel-left"
          color="neutral"
          variant="ghost"
          aria-label="Toggle sidebar"
          @click="open = !open"
        />
      </div>

      <div class="flex-1 py-10 px-10">
        <slot />
      </div>
    </div>
  </div>
</template>
