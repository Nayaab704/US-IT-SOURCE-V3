/**
 * Copy an email address (contact section, /about): async clipboard with a textarea fallback, a
 * 2-second "Copied" state for the button, and a sentence for a polite live region.
 */
export function useCopyEmail() {
  const copied = ref<string | null>(null)
  const announce = ref('')
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(email: string) {
    let ok = false
    try {
      await navigator.clipboard.writeText(email)
      ok = true
    } catch {
      // Fallback for browsers / contexts without the async clipboard.
      const ta = document.createElement('textarea')
      ta.value = email
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      ok = document.execCommand('copy')
      ta.remove()
    }
    if (!ok) return
    copied.value = email
    announce.value = `${email} copied to the clipboard.`
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = null), 2000)
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })
  return { copied, announce, copy }
}
