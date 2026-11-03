<script setup lang="ts">
import { leaders } from '~/data/about'

/**
 * /about — leadership (paper): three tall portraits at slightly different heights (editorial, not a
 * grid); name, role, email with a copy button. Hover / focus: the photo scales a touch and a short bio
 * fades in (on touch screens it is always shown). Portraits come from public/media/team/
 * firstname-lastname.*; until then a labelled frame — never a stand-in face.
 */
const { copied, announce, copy } = useCopyEmail()
</script>

<template>
  <section class="ald" data-world="day" aria-labelledby="ald-title">
    <h2 id="ald-title" class="ald-title">Leadership</h2>
    <ul class="ald-list">
      <li v-for="p in leaders" :key="p.email" class="ald-person">
        <div class="ald-portrait">
          <picture v-if="p.portrait">
            <source v-if="p.portrait.avif" :srcset="p.portrait.avif" type="image/avif" sizes="(max-width: 767px) 88vw, 28vw" />
            <img :src="p.portrait.src" :srcset="p.portrait.srcset" sizes="(max-width: 767px) 88vw, 28vw" :alt="`Portrait of ${p.name}`" :width="p.portrait.width" :height="p.portrait.height" loading="lazy" decoding="async" />
          </picture>
          <span v-else class="ald-ph">[PORTRAIT: {{ p.name }}]</span>
          <p class="ald-bio">{{ p.bio }}</p>
        </div>
        <h3 class="ald-name">{{ p.name }}</h3>
        <p class="ald-role">{{ p.role }}</p>
        <p class="ald-email">
          <a :href="`mailto:${p.email}`">{{ p.email }}</a>
          <button type="button" class="ald-copy" :aria-label="`Copy ${p.email}`" @click="copy(p.email)">
            {{ copied === p.email ? 'Copied' : 'Copy' }}
          </button>
        </p>
      </li>
    </ul>
    <p class="sr-only" aria-live="polite">{{ announce }}</p>
  </section>
</template>

<style scoped>
.ald {
  padding: 14vh var(--gutter) 22vh;
  color: var(--ink);
}

.ald-title {
  margin: 0 0 10vh;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(40px, 5vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.015em;
}

.ald-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4vw;
  align-items: start;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Editorial, not a grid: each portrait sits at its own height. */
.ald-person:nth-child(2) {
  margin-top: 8vh;
}

.ald-person:nth-child(3) {
  margin-top: 3vh;
}

.ald-portrait {
  position: relative;
  aspect-ratio: 3 / 4;
  margin-bottom: 22px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--paper-raised);
  box-shadow: inset 0 0 0 1px rgba(22, 24, 29, 0.1);
}

.ald-portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
}

.ald-ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  font-family: var(--font-mono);
  font-size: var(--fs-mono-label);
  letter-spacing: 0.06em;
  text-align: center;
  color: rgba(22, 24, 29, 0.66);
}

.ald-bio {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  margin: 0;
  padding: 40px 18px 16px;
  font-family: var(--font-sans);
  font-size: 14px;
  line-height: 1.45;
  color: var(--ink);
  background: linear-gradient(to top, rgba(251, 250, 246, 0.96) 55%, rgba(251, 250, 246, 0));
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.6s,
    transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

.ald-person:hover .ald-portrait img,
.ald-person:focus-within .ald-portrait img {
  transform: scale(1.03);
}

.ald-person:hover .ald-bio,
.ald-person:focus-within .ald-bio {
  opacity: 1;
  transform: none;
}

/* Touch screens have no hover: the bio is simply there. */
@media (hover: none) {
  .ald-bio {
    opacity: 1;
    transform: none;
  }
}

.ald-name {
  margin: 0 0 6px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(26px, 2.2vw, 34px);
  line-height: 1.1;
}

.ald-role {
  margin: 0 0 12px;
  font-family: var(--font-sans);
  font-size: 15px;
  color: rgba(22, 24, 29, 0.72);
}

.ald-email {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--font-sans);
  font-size: 15px;
}

.ald-email a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: rgba(22, 24, 29, 0.3);
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
}

.ald-copy {
  padding: 4px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink);
  background: transparent;
  border: 1px solid rgba(22, 24, 29, 0.25);
  border-radius: 999px;
  cursor: pointer;
}

.ald-copy:hover,
.ald-copy:focus-visible {
  border-color: var(--ink);
}

@media (max-width: 767px) {
  .ald-list {
    grid-template-columns: 1fr;
    gap: 9vh;
  }

  .ald-person:nth-child(2),
  .ald-person:nth-child(3) {
    margin-top: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .ald-portrait img,
  .ald-bio {
    transition: none;
  }
}
</style>
