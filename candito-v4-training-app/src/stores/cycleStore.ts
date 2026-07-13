import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Cycle } from '@/types/cycle'
import { getProvider } from '@/services/storage'

export const useCycleStore = defineStore('cycle', () => {
  const cycles = ref<Cycle[]>([])
  const activeCycleId = ref<string | null>(null)

  const activeCycle = computed(() => {
    const cycle = cycles.value.find((c: Cycle) => c.id === activeCycleId.value)
    if (!cycle) return null
    if (cycle.status === 'terminated' || cycle.status === 'completed') return null
    return cycle
  })

  const hasActiveCycle = computed(() => activeCycle.value !== null)

  async function load(): Promise<void> {
    const provider = getProvider()
    cycles.value = await provider.loadCycles()
    activeCycleId.value = await provider.loadActiveCycleId()
  }

  function save(): void {
    const provider = getProvider()
    provider.saveCycles(cycles.value)
    provider.saveActiveCycleId(activeCycleId.value)
  }

  function addCycle(cycle: Cycle): void {
    cycles.value.push(cycle)
    activeCycleId.value = cycle.id
    save()
  }

  function updateCycle(id: string, updates: Partial<Cycle>): void {
    const index = cycles.value.findIndex((c: Cycle) => c.id === id)
    if (index !== -1) {
      cycles.value[index] = { ...cycles.value[index], ...updates }
      save()
    }
  }

  function deleteCycle(id: string): void {
    cycles.value = cycles.value.filter((c: Cycle) => c.id !== id)
    if (activeCycleId.value === id) {
      activeCycleId.value = null
    }
    save()
  }

  function setActiveCycle(id: string): void {
    activeCycleId.value = id || null
    save()
  }

  function getCycleById(id: string): Cycle | undefined {
    return cycles.value.find((c: Cycle) => c.id === id)
  }

  function getCompletedCycles(): Cycle[] {
    return cycles.value.filter((c: Cycle) => c.status === 'completed' || c.status === 'terminated')
  }

  return {
    cycles,
    activeCycleId,
    activeCycle,
    hasActiveCycle,
    load,
    save,
    addCycle,
    updateCycle,
    deleteCycle,
    setActiveCycle,
    getCycleById,
    getCompletedCycles,
  }
})
