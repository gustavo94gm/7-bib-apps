<script setup lang="ts">
import type { DateValue } from '@internationalized/date'

export interface DateRange {
  start: DateValue | undefined
  end: DateValue | undefined
}

const props = withDefaults(defineProps<{ label?: string }>(), {
  label: 'Período',
})

const dateRange = defineModel<DateRange>({ required: true })

const isOpen = ref(false)

const dateRangeLabel = computed(() => {
  const { start, end } = dateRange.value
  if (!start && !end) return 'Selecionar período'
  const fmt = (d: DateValue) => `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}`
  if (start && end) return `${fmt(start)} – ${fmt(end)}`
  if (start) return `A partir de ${fmt(start)}`
  return 'Período selecionado'
})
</script>

<template>
  <UFormField :label="label">
    <UPopover v-model:open="isOpen">
      <UButton
        icon="i-lucide-calendar"
        variant="outline"
        color="neutral"
        class="w-full justify-start font-normal"
        :label="dateRangeLabel"
      />
      <template #content>
        <div class="p-3 space-y-3">
          <UCalendar
            v-model="dateRange"
            range
            :number-of-months="2"
          />
          <div class="flex justify-end gap-2 border-t border-default pt-3">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              label="Limpar"
              @click="dateRange = { start: undefined, end: undefined }"
            />
            <UButton
              size="xs"
              label="Aplicar"
              :disabled="!dateRange.start"
              @click="isOpen = false"
            />
          </div>
        </div>
      </template>
    </UPopover>
  </UFormField>
</template>
