import type { Pane } from 'tweakpane'

let panePromise: Promise<Pane> | null = null

/**
 * Dev-only Tweakpane root panel (with ?debug in the URL). Scenes add their own folders to it.
 * Resolves to null in production; the dynamic import sits behind `import.meta.dev`
 * so Tweakpane is never bundled into a production build.
 */
export function useDevPane(): Promise<Pane | null> {
  // Dev only, and only on request (?debug): visitors and reviews of the dev build see a clean page.
  if (!import.meta.dev || !import.meta.client || !new URLSearchParams(window.location.search).has('debug')) return Promise.resolve(null)
  panePromise ??= import('tweakpane').then(({ Pane }) => {
    const pane = new Pane({ title: 'Dev', expanded: false })
    // Tweakpane's default wrapper is position:absolute with no z-index: the fixed site nav
    // covered it (unclickable) and it scrolled away with the page. Pin it above everything.
    const wrapper = pane.element.parentElement
    if (wrapper) {
      Object.assign(wrapper.style, {
        position: 'fixed',
        zIndex: '10000',
        maxHeight: 'calc(100vh - 16px)',
        overflowY: 'auto',
      } satisfies Partial<CSSStyleDeclaration>)
      // Let the wheel scroll the panel itself instead of Lenis scrolling the page.
      wrapper.setAttribute('data-lenis-prevent', '')
    }
    return pane
  })
  return panePromise
}
