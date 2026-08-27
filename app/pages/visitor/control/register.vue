<script setup lang="ts">
useSeoMeta({
  title: 'Registrar Visitante',
  description: 'Registre a entrada de um visitante.',
})

const toast = useToast()
const router = useRouter()

const today = new Date().toISOString().slice(0, 10)
const now = new Date().toTimeString().slice(0, 5)

const form = reactive({
  cpf: '',
  name: '',
  visitDate: today,
  badgeNumber: '',
  destination: '',
  entryTime: now,
  exitTime: '',
})

const loading = ref(false)

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/visitors', {
      method: 'POST',
      body: form,
    })
    toast.add({ title: 'Visitante registrado com sucesso!', color: 'success' })
    router.push('/visitor/control')
  } catch {
    toast.add({ title: 'Erro ao registrar visitante.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Registrar Visitante</h1>
      <p class="text-sm text-muted mt-1">Preencha os dados de entrada do visitante.</p>
    </div>

    <UCard>
      <form class="space-y-5" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="CPF" required>
            <UInput v-model="form.cpf" placeholder="000.000.000-00" required class="w-full" />
          </UFormField>

          <UFormField label="Nome" required>
            <UInput v-model="form.name" required class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Data" required>
            <UInput v-model="form.visitDate" type="date" required class="w-full" />
          </UFormField>

          <UFormField label="Nº Crachá" required>
            <UInput v-model="form.badgeNumber" required class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Destino" required>
          <UInput v-model="form.destination" placeholder="Setor ou pessoa a ser visitada" required class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Hora de entrada" required>
            <UInput v-model="form.entryTime" type="time" required class="w-full" />
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
