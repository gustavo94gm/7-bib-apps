<script setup lang="ts">
useSeoMeta({
  title: 'Registrar Visitante',
  description: 'Registre a entrada de um visitante.',
});

const toast = useToast();
const router = useRouter();

const today = new Date().toISOString().slice(0, 10);
const now = new Date().toTimeString().slice(0, 5);

const form = reactive({
  cpf: '',
  name: '',
  visitDate: today,
  badgeNumber: '',
  destination: '',
  situation: '',
  entryTime: now,
  exitTime: '',
});

const situationOptions = [
  { label: 'Civil', value: 'civil' },
  { label: 'Inativo/Pensionista', value: 'inativo_pensionista' },
  { label: 'Militar de outra OM', value: 'militar_outra_om' },
  { label: 'Militar da reserva', value: 'militar_reserva' },
];

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

watch(
  () => form.cpf,
  (value) => {
    const formatted = formatCpf(value);
    if (formatted !== value) form.cpf = formatted;
  },
);

const NAV_KEYS = [
  'Backspace',
  'Delete',
  'Tab',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
];

function blockNonDigits(event: KeyboardEvent) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (NAV_KEYS.includes(event.key)) return;
  if (!/^\d$/.test(event.key)) event.preventDefault();
}

const cpfValid = computed(() => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(form.cpf));

watch(cpfValid, async (valid) => {
  if (!valid) return;
  const visitor = await $fetch<{ name: string; situation: string } | null>(
    `/api/visitors/by-cpf/${form.cpf}`,
  ).catch(() => null);
  if (!visitor) return;
  form.name = visitor.name;
  form.situation = visitor.situation;
});

const loading = ref(false);

async function submit() {
  if (!cpfValid.value) {
    toast.add({
      title: 'CPF inválido. Use o formato 000.000.000-00.',
      color: 'error',
    });
    return;
  }
  loading.value = true;
  try {
    await $fetch('/api/visitors', {
      method: 'POST',
      body: form,
    });
    toast.add({ title: 'Visitante registrado com sucesso!', color: 'success' });
    router.push('/visitor/control');
  } catch {
    toast.add({ title: 'Erro ao registrar visitante.', color: 'error' });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Registrar Visitante
      </h1>
      <p class="text-sm text-muted mt-1">
        Preencha os dados de entrada do visitante.
      </p>
    </div>

    <UCard>
      <form class="space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-4">
          <UFormField
            label="CPF"
            required
            :error="form.cpf && !cpfValid ? 'Formato inválido' : undefined"
          >
            <UInput
              v-model="form.cpf"
              placeholder="000.000.000-00"
              inputmode="numeric"
              maxlength="14"
              required
              class="w-full"
              @keydown="blockNonDigits"
            />
          </UFormField>

          <UFormField label="Nome" required>
            <UInput v-model="form.name" required class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Data" required>
            <UInput
              v-model="form.visitDate"
              type="date"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Nº Crachá" required>
            <UInput v-model="form.badgeNumber" required class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Destino" required>
            <UInput
              v-model="form.destination"
              placeholder="Setor ou pessoa a ser visitada"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Situação" required>
            <USelect
              v-model="form.situation"
              :items="situationOptions"
              placeholder="Selecione a situação"
              required
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Hora de entrada" required>
            <UInput
              v-model="form.entryTime"
              type="time"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Hora de saída">
            <UInput v-model="form.exitTime" type="time" class="w-full" />
          </UFormField>
        </div>

        <div class="flex justify-end gap-3 pt-2">
          <UButton type="submit" :loading="loading" icon="i-lucide-send">
            Registrar
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
