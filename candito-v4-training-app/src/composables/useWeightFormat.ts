import { unref } from 'vue'
import type { Ref } from 'vue'

const KG_TO_LB = 2.20462

export function useWeightFormat(rounding: Ref<number> | number) {
  function formatWeight(weight: number): number {
    const step = unref(rounding)
    return Math.round(weight / step) * step
  }

  function displayWeight(weight: number): string {
    const rounded = formatWeight(weight)
    if (Number.isInteger(rounded)) {
      return String(rounded)
    }
    return rounded.toFixed(1)
  }

  function convertWeight(weight: number, from: 'kg' | 'lb', to: 'kg' | 'lb'): number {
    if (from === to) return weight
    if (from === 'kg' && to === 'lb') return weight * KG_TO_LB
    return weight / KG_TO_LB
  }

  return { formatWeight, displayWeight, convertWeight }
}
