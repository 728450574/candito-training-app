import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Cycle } from '@/types/cycle'

const STORAGE_KEY = 'candito_cycles'
const ACTIVE_KEY = 'candito_active_cycle'

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

  function load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      cycles.value = raw ? JSON.parse(raw) as Cycle[] : []
    } catch {
      cycles.value = []
    }

    try {
      const raw = localStorage.getItem(ACTIVE_KEY)
      activeCycleId.value = raw ? JSON.parse(raw) as string : null
    } catch {
      activeCycleId.value = null
    }
  }

  function save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cycles.value))
    } catch {
      // storage full or unavailable
    }

    try {
      if (activeCycleId.value !== null) {
        localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeCycleId.value))
      } else {
        localStorage.removeItem(ACTIVE_KEY)
      }
    } catch {
      // storage full or unavailable
    }
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

  load()

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
