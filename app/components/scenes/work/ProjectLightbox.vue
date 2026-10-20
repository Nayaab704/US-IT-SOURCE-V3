<script setup lang="ts">
import type { ProjectScreen } from '~/data/projects'

/**
 * One screenshot large on a dark overlay (F1). Native <dialog>: modal focus trap and Esc for free.
 * ← / → browse the project's screens; focus returns to the screen that opened it.
 */
const dialog = ref<HTMLDialogElement | null>(null)
const screens = shallowRef<ProjectScreen[]>([])
const index = ref(0)
const { start, stop } = useLenis()
let returnTo: HTMLElement | null = null

const current = computed(() => screens.value[index.value] ?? null)
const isPhone = ref(false)

function open(list: ProjectScreen[], i: number, from: HTMLElement | null) {
  screens.value = list
  index.value = i
  returnTo = from
  isPhone.value = list[i]?.mobile ?? false
  stop()
  dialog.value?.showModal()
}
function close() {
  dialog.value?.close()
}
function onClose() {
  start()
  returnTo?.focus({ preventScroll: true })
  returnTo = null
}
function go(dir: number) {
  const n = screens.value.length
  if (!n) return
  index.value = (index.value + dir + n) % n
  isPhone.value = current.value?.mobile ?? false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') go(1)
  else if (e.key === 'ArrowLeft') go(-1)
  else return
  e.preventDefault()
}
function onImg(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth) isPhone.value = img.naturalWidth / img.naturalHeight < 0.9
}
// A click on the backdrop (the dialog itself, outside its content) closes it.
function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="lb" aria-label="Project screen" @close="onClose" @keydown="onKey" @click="onBackdrop">
    <div v-if="current" class="lb-inner">
      <figure class="lb-figure" :class="{ 'is-phone': isPhone }">
        <img v-if="current.src" :key="current.src" :src="current.src" :alt="current.label" @load="onImg" />
        <div v-else class="lb-ph">[{{ current.label }}]</div>
      </figure>
      <p class="sr-only" aria-live="polite">{{ current.label }}, {{ index + 1 }} of {{ screens.length }}</p>
      <div class="lb-controls">
        <button type="button" class="lb-btn" aria-label="Previous screen" @click="go(-1)">←</button>
        <button type="button" class="lb-btn" aria-label="Next screen" @click="go(1)">→</button>
      </div>
      <button type="button" class="lb-btn lb-close" aria-label="Close" autofocus @click="close">Close</button>
    </div>
  </dialog>
</template>

<style scoped>
.lb {
  width: 100vw;
  max-width: none;
  height: 100vh;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--paper);
}

.lb::backdrop {
  background: rgba(10, 11, 13, 0.88);
}

.lb[open] {
  animation: lb-in 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes lb-in {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
}

.lb-inner {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 8vh 6vw 14vh;
  pointer-events: none;
}

.lb-inner > * {
  pointer-events: auto;
}

.lb-figure {
  margin: 0;
  max-width: min(1400px, 88vw);
  max-height: 76vh;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 40px 80px -30px rgba(0, 0, 0, 0.6);
}

.lb-figure img {
  display: block;
  max-width: 100%;
  max-height: 76vh;
  object-fit: contain;
}

.lb-figure.is-phone {
  padding: 8px;
  border-radius: 44px;
  background: #111214;
}

.lb-figure.is-phone img {
  border-radius: 36px;
}

.lb-ph {
  display: grid;
  place-items: center;
  width: min(1100px, 80vw);
  aspect-ratio: 16 / 10;
  max-height: 76vh;
  background: #e6e3dc;
  color: #55544f;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.04em;
}

.lb-figure.is-phone .lb-ph {
  width: auto;
  height: 70vh;
  aspect-ratio: 9 / 19.5;
  border-radius: 36px;
}

.lb-controls {
  position: absolute;
  bottom: 5vh;
  left: 50%;
  display: flex;
  gap: 12px;
  translate: -50% 0;
}

.lb-btn {
  min-width: 44px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  background: transparent;
  color: var(--paper);
  font-family: var(--font-sans);
  font-size: 14px;
  cursor: pointer;
}

.lb-btn:hover,
.lb-btn:focus-visible {
  background: rgba(255, 255, 255, 0.1);
}

.lb-close {
  position: absolute;
  top: 3vh;
  right: var(--gutter);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
</style>
