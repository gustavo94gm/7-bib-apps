<script setup lang="ts">
useSeoMeta({
  title: 'Novo Chamado',
  description: 'Abra um novo chamado de suporte.',
})

const { categories, graduations, sections } = await useLookups()

const toast = useToast()
const router = useRouter()

const loading = ref(false)

const form = reactive({
  requesterName: '',
  requesterGraduationId: null as number | null,
  requesterSectionId: null as number | null,
  categoryId: null as number | null,
  title: '',
  description: '',
})

const categoryOptions = computed(() =>
  (categories.value ?? []).map((c: any) => ({ label: c.name, value: c.id }))
)
const graduationOptions = computed(() =>
  (graduations.value ?? []).map((g: any) => ({ label: g.abbreviation, value: g.id }))
)
const sectionOptions = computed(() =>
  (sections.value ?? []).map((s: any) => ({ label: s.name, value: s.id }))
)

async function submit() {
  loading.value = true
  try {
    await $fetch('/api/tickets', {
      method: 'POST',
      body: {
        title: form.title,
        description: form.description,
        categoryId: form.categoryId,
        requesterName: form.requesterName,
        requesterGraduationId: form.requesterGraduationId,
        requesterSectionId: form.requesterSectionId,
      },
    })
    toast.add({ title: 'Chamado aberto com sucesso!', color: 'success' })
    router.push('/')
  } catch {
    toast.add({ title: 'Erro ao abrir chamado.', color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mx-auto space-y-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">Novo Chamado</h1>
      <p class="text-sm text-muted mt-1">Preencha os campos abaixo para abrir um chamado de suporte.</p>
    </div>

    <UCard>
      <form class="space-y-5" @submit.prevent="submit">

        <fieldset class="space-y-4">
          <legend class="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Solicitante</legend>

          <UFormField label="Nome de guerra" required>
            <UInput
              v-model="form.requesterName"
              required
              class="w-full"
            />
          </UFormField>

          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Graduação" required>
              <USelect
                v-model="form.requesterGraduationId"
                :items="graduationOptions"
                placeholder="Selecione"
                required
                class="w-full"
              />
            </UFormField>

            <UFormField label="Seção" required>
              <USelect
                v-model="form.requesterSectionId"
                :items="sectionOptions"
                placeholder="Selecione"
                required
                class="w-full"
              />
            </UFormField>
          </div>
        </fieldset>

        <USeparator />

        <fieldset class="space-y-4">
          <legend class="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Chamado</legend>

          <UFormField label="Categoria" required>
            <USelect
              v-model="form.categoryId"
              :items="categoryOptions"
              placeholder="Selecione uma categoria"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Título" required>
            <UInput
              v-model="form.title"
              placeholder="Descreva brevemente o problema"
              required
              class="w-full"
            />
          </UFormField>

          <UFormField label="Descrição" required>
            <UTextarea
              v-model="form.description"
              placeholder="Descreva com detalhes o problema..."
              :rows="5"
              class="w-full"
            />
          </UFormField>
        </fieldset>

        <div class="flex justify-end gap-3 pt-2">
          <UButton type="submit" :loading="loading" icon="i-lucide-send">
            Abrir Chamado
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
