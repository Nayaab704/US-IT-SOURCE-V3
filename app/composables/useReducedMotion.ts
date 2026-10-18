const QUERY = '(prefers-reduced-motion: reduce)'

// Shared across the app so there is only ever one matchMedia listener.
const reduced = ref(false)
let initialised = false

/** Reactive `prefers-reduced-motion`. Always `false` during SSR. */
export function useReducedMotion(): Readonly<Ref<boolean>> {
  if (import.meta.client && !initialised) {
    initialised = true
    const mql = window.matchMedia(QUERY)
    reduced.value = mql.matches
    mql.addEventListener('change', (e) => {
      reduced.value = e.matches
    })
  }
  return readonly(reduced)
}
