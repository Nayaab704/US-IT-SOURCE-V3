// The server-rendered page paints before the app hydrates. Without this, the (already cached) scripts
// run straight after parsing and the browser gets no frame until hydration and the scroll scenes are
// set up — on a slow phone, seconds of blank screen in front of HTML that was ready all along.
// Waiting one frame costs ~16 ms; the timeout covers background tabs, where frames never come.
export default defineNuxtPlugin({
  name: 'paint-first',
  enforce: 'pre',
  async setup() {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve, 0))
      setTimeout(resolve, 120)
    })
  },
})
