<script setup lang="ts">
import { gsap } from 'gsap'
import { people } from '~/data/contact'
import { MENU_LINKS, type MenuKey } from '~/composables/useMenu'

/**
 * The menu (F4, Metalab-style). The live page "shrinks into a card": a warm-white layer with a
 * rounded-rect hole (clip-path evenodd) closes in from the edges until only a portrait card of the
 * live page remains. Links left, contact emails right. Hovering / focusing a link shows a still of
 * that section in the card; clicking one jumps the page there under the still, opens the card back to
 * full screen and fades the still to reveal the live section. Esc / Close reverses. No transform on
 * the document (that would break every pinned section). Phones: a plain full-screen list.
 */
const { open, goTo } = useMenu()
const { start, stop } = useLenis()
const prefersReduced = useReducedMotion()
const device = useDevice()
// Server renders desktop; the phone variant switches in after mount (no hydration mismatch).
const mounted = ref(false)
const isMobile = computed(() => mounted.value && device.isMobile.value)

const layer = ref<HTMLElement | null>(null)
const card = ref<HTMLElement | null>(null)
const content = ref<HTMLElement | null>(null)
const firstLink = ref<HTMLElement | null>(null)
const visible = ref(false)
const still = ref<MenuKey | null>(null)
const state = { p: 0 }
let tween: gsap.core.Timeline | null = null
let returnFocus: HTMLElement | null = null

/** The card's rect at p = 1 (portrait, centred). */
function cardRect() {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const h = vh * 0.72
  const w = Math.min(vw * 0.26, h * 0.64)
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h, r: 18 }
}

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2)
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}

function render() {
  const el = layer.value
  if (!el) return
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (isMobile.value) {
    el.style.clipPath = ''
    el.style.opacity = String(state.p)
    return
  }
  el.style.opacity = '1'
  const c = cardRect()
  const p = state.p
  const x = c.x * p
  const y = c.y * p
  const w = vw + (c.w - vw) * p
  const h = vh + (c.h - vh) * p
  const r = c.r * p
  // Outer rect + the hole (even-odd): the live page shows through the hole.
  // The outer rect overshoots the viewport (no anti-aliased hairline at the screen edges).
  el.style.clipPath = `path(evenodd, "M-4 -4H${vw + 4}V${vh + 4}H-4Z ${roundedRect(x, y, w, h, r)}")`
  const cd = card.value
  if (cd) {
    cd.style.left = `${x}px`
    cd.style.top = `${y}px`
    cd.style.width = `${w}px`
    cd.style.height = `${h}px`
    cd.style.borderRadius = `${r}px`
  }
  if (content.value) content.value.style.opacity = String(Math.max(0, (p - 0.55) / 0.45))
}

const DUR = () => (prefersReduced.value ? 0.01 : 0.7)

function openMenu() {
  if (visible.value) return
  returnFocus = document.activeElement as HTMLElement | null
  visible.value = true
  still.value = null
  stop()
  document.documentElement.classList.add('menu-open')
  nextTick(() => {
    tween?.kill()
    tween = gsap.timeline({ onUpdate: render }).to(state, { p: 1, duration: DUR(), ease: 'power3.inOut', onUpdate: render })
    if (content.value) gsap.fromTo(content.value.querySelectorAll('.mn-rise'), { y: 18 }, { y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: DUR() * 0.6 })
    firstLink.value?.focus({ preventScroll: true })
  })
}

/** Close; with a target, jump there under the card first and reveal it as the card opens. */
function closeMenu(target: MenuKey | null = null) {
  if (!visible.value) return
  tween?.kill()
  if (target) {
    still.value = target
    goTo(target, true)
  }
  tween = gsap
    .timeline({
      onComplete: () => {
        visible.value = false
        document.documentElement.classList.remove('menu-open')
        open.value = false
        start()
        // After a jump, focus the section's heading region; else back to the Menu button.
        if (!target) returnFocus?.focus({ preventScroll: true })
      },
    })
    .to(state, { p: 0, duration: DUR(), ease: 'power3.inOut', onUpdate: render })
    .to({}, { duration: target ? 0.35 : 0, onStart: () => (still.value = null) })
}

watch(open, (v) => (v ? openMenu() : closeMenu()))

function onKey(e: KeyboardEvent) {
  if (!visible.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    open.value = false
    return
  }
  if (e.key !== 'Tab' || !layer.value) return
  // Keep focus inside the menu.
  const items = [...layer.value.querySelectorAll<HTMLElement>('a, button')]
  if (!items.length) return
  const first = items[0]!
  const last = items[items.length - 1]!
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault()
    first.focus()
  }
}
function onResize() {
  if (visible.value) render()
}
/** Keyboard focus previews the section; the programmatic focus on open keeps the live page. */
function onFocus(e: FocusEvent, key: MenuKey) {
  if ((e.target as HTMLElement).matches(':focus-visible')) still.value = key
}
const route = useRoute()
function pick(key: MenuKey, e: Event) {
  e.preventDefault()
  if (route.path !== '/') {
    // Another page (a case study): go home, straight to that section (no opening).
    open.value = false
    void navigateTo(key === 'home' ? '/' : `/?to=${key}`)
    return
  }
  closeMenu(key)
}

onMounted(() => {
  mounted.value = true
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
  tween?.kill()
  document.documentElement.classList.remove('menu-open')
})
</script>

<template>
  <div v-show="visible" class="mn" :class="{ 'is-mobile': isMobile }">
    <!-- The card: section stills over the live page (desktop). -->
    <div ref="card" class="mn-card" aria-hidden="true">
      <img v-for="l in MENU_LINKS" :key="l.key" :src="l.still" alt="" class="mn-still" :class="{ on: still === l.key }" loading="lazy" decoding="async" />
    </div>
    <div id="site-menu" ref="layer" class="mn-layer" role="dialog" aria-modal="true" aria-label="Menu">
      <div ref="content" class="mn-content">
        <nav class="mn-links" aria-label="Sections">
          <a
            v-for="(l, i) in MENU_LINKS"
            :key="l.key"
            :ref="i === 0 ? (el) => (firstLink = el as HTMLElement) : undefined"
            :href="l.key === 'home' ? '#top' : `#${l.key}`"
            class="mn-link mn-rise"
            @mouseenter="still = l.key"
            @mouseleave="still = null"
            @focus="onFocus($event, l.key)"
            @blur="still = null"
            @click="pick(l.key, $event)"
          >
            {{ l.label }}
          </a>
        </nav>
        <div class="mn-contact">
          <p class="mn-label mn-rise">Contact</p>
          <ul>
            <li v-for="p in people" :key="p.email" class="mn-rise">
              <span class="mn-name">{{ p.name }}</span>
              <a :href="`mailto:${p.email}`">{{ p.email }}</a>
            </li>
          </ul>
        </div>
        <button type="button" class="mn-close" @click="open = false">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mn {
  position: fixed;
  inset: 0;
  z-index: 850;
}

.mn-layer {
  position: absolute;
  inset: 0;
  background: #fbf7ef;
  color: #121212;
}

.mn-card {
  position: fixed;
  overflow: hidden;
  pointer-events: none;
}

.mn-still {
  position: absolute;
  inset: -1px;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.mn-still.on {
  opacity: 1;
}

.mn-content {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: 1fr minmax(0, 26vw) 1fr;
  align-items: center;
  padding: 0 var(--gutter);
  opacity: 0;
}

.mn-links {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.mn-link {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(44px, 5.6vw, 84px);
  line-height: 1.04;
  letter-spacing: -0.02em;
  color: #121212;
  text-decoration: none;
  transition: opacity 0.3s;
}

.mn-links:hover .mn-link:not(:hover) {
  opacity: 0.35;
}

.mn-link:focus-visible {
  outline: 2px solid #121212;
  outline-offset: 4px;
}

.mn-contact {
  grid-column: 3;
  justify-self: end;
  font-family: var(--font-sans);
  font-size: 14px;
}

.mn-contact ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.mn-contact li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}

.mn-label {
  margin: 0 0 18px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(18, 18, 18, 0.62);
}

.mn-name {
  color: rgba(18, 18, 18, 0.62);
  font-size: 12px;
}

.mn-contact a {
  color: #121212;
  text-decoration: none;
  border-bottom: 1px solid rgba(18, 18, 18, 0.25);
}

.mn-contact a:hover,
.mn-contact a:focus-visible {
  border-bottom-color: #121212;
}

.mn-close {
  position: absolute;
  top: 24px;
  right: var(--gutter);
  padding: 9px 16px;
  border: 1px solid #121212;
  border-radius: 999px;
  background: transparent;
  color: #121212;
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
}

/* Phones: a plain full-screen list. */
.mn.is-mobile .mn-card {
  display: none;
}

.mn.is-mobile .mn-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 8vh;
  opacity: 1;
}

.mn.is-mobile .mn-contact {
  justify-self: auto;
}

.mn.is-mobile .mn-link {
  font-size: 48px;
}
</style>
