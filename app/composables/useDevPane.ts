import type { Pane } from 'tweakpane'

let panePromise: Promise<Pane> | null = null

/**
 * Dev-only Tweakpane root panel. Scenes add their own folders to it.
 * Resolves to null in production; the dynamic import sits behind `import.meta.dev`
 * so Tweakpane is never bundled into a production build.
 */
export function useDevPane(): Promise<Pane | null> {
  if (!import.meta.dev || !import.meta.client) return Promise.resolve(null)
  panePromise ??= import('tweakpane').then(({ Pane }) => new Pane({ title: 'Dev', expanded: false }))
  return panePromise
}
