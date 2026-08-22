<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
</script>

<template>
  <UError
    icon="i-lucide-file-x"
    :clear="{ label: 'Voltar para a página inicial' }"
    :error="{
      statusCode: 404,
      statusMessage: 'Página não encontrada.',
      message: 'A página que você está procurando não existe.'
    }"
  />
</template>

