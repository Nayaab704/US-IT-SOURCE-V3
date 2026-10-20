<script setup lang="ts">
import { loadCaseStudy, type CaseSection } from '~/data/caseStudies'
import { projects, type ProjectScreen } from '~/data/projects'

/**
 * A case study: /work/<slug>. The project comes from app/data/projects.ts, the text from its Markdown
 * file in docs/case-studies/ (rendered whatever it contains — see docs/ADDING_A_PROJECT.md), the
 * screenshots from public/media/projects/<slug>/. Editorial layout: warm paper, Newsreader headings,
 * Geist body, one blue accent.
 */
type LightboxHandle = { open: (screens: ProjectScreen[], index: number, from: HTMLElement | null) => void }

const route = useRoute()
const slug = computed(() => String(route.params.slug))
const index = computed(() => projects.findIndex((p) => p.slug === slug.value))
const project = computed(() => projects[index.value])
if (!project.value) throw createError({ statusCode: 404, statusMessage: 'Project not found', fatal: true })
const study = computed(() => (project.value ? loadCaseStudy(project.value.caseStudy) : null))
const next = computed(() => (projects.length > 1 ? projects[(index.value + 1) % projects.length] : null))

const title = computed(() => `${study.value?.title || project.value?.name} — US IT Source`)
const description = computed(() => study.value?.description || project.value?.oneLiner || '')
useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogImage: () => project.value?.screens.find((s) => s.src && !s.mobile)?.src ?? '/og.jpg',
  twitterCard: 'summary_large_image',
})
useHead({ bodyAttrs: { class: 'ground-paper' } })
useWorldSections()

const screens = computed(() => project.value?.screens.filter((s) => s.src) ?? [])
const heroShot = computed(() => screens.value.find((s) => !s.mobile) ?? screens.value[0] ?? null)
const sections = computed<CaseSection[]>(() => study.value?.sections ?? [])

const lightbox = ref<LightboxHandle | null>(null)
function openShot(i: number, e: Event) {
  lightbox.value?.open(screens.value, i, e.currentTarget as HTMLElement)
}

const { go } = useRectTransition()
function toNext(e: MouseEvent) {
  if (next.value) go(next.value.href, e.currentTarget as HTMLElement)
}
function toContact() {
  void navigateTo('/?to=contact')
}
</script>

<template>
  <UiPillNav />
  <UiSiteMenu />
  <main v-if="project" id="main" class="cs" data-world="day">
    <!-- Hero -->
    <header class="cs-hero">
      <p class="cs-kicker">Case study</p>
      <h1 class="cs-title">{{ study?.title || project.name }}</h1>
      <p class="cs-subtitle">{{ study?.subtitle || project.oneLiner }}</p>
      <ul class="cs-chips" aria-label="Scope">
        <li v-for="c in project.chips" :key="c">{{ c }}</li>
      </ul>
      <figure v-if="heroShot" class="cs-shot">
        <img :src="heroShot.src!" :alt="`${project.name} — ${heroShot.label}`" decoding="async" />
      </figure>
    </header>

    <!-- Sections, in the order of the Markdown file -->
    <section v-for="s in sections" :id="s.id" :key="s.id" class="cs-section" :class="`is-${s.kind}`">
      <h2 class="cs-h2">{{ s.heading }}</h2>
      <div class="cs-body">
        <p v-if="s.empty" class="cs-pending">Section in progress</p>

        <template v-else-if="s.kind === 'lifecycle' && s.items.length">
          <CaseLifecycle :items="s.items" />
        </template>

        <template v-else-if="s.kind === 'modules' && s.items.length">
          <dl class="cs-modules">
            <div v-for="(it, i) in s.items" :key="i" class="cs-module">
              <dt>{{ it.label ?? it.text }}</dt>
              <!-- eslint-disable-next-line vue/no-v-html — escaped by the case-study parser -->
              <dd v-if="it.label" v-html="it.html" />
            </div>
          </dl>
        </template>

        <template v-else-if="s.kind === 'actions' && s.items.length">
          <CaseActions :items="s.items" />
        </template>

        <template v-else-if="s.kind === 'roles' && s.items.length">
          <div class="cs-roles">
            <div v-for="(it, i) in s.items" :key="i" class="cs-role">
              <h3>{{ it.label ?? it.text }}</h3>
              <!-- eslint-disable-next-line vue/no-v-html — escaped by the case-study parser -->
              <p v-if="it.label" v-html="it.html" />
            </div>
          </div>
        </template>

        <template v-else-if="s.kind === 'stack' && s.items.length">
          <ul class="cs-stack">
            <li v-for="(it, i) in s.items" :key="i">{{ it.text }}</li>
          </ul>
        </template>

        <template v-else-if="s.items.length">
          <ul class="cs-list">
            <li v-for="(it, i) in s.items" :key="i">
              <strong v-if="it.label">{{ it.label }}</strong>
              <!-- eslint-disable-next-line vue/no-v-html — escaped by the case-study parser -->
              <span v-html="it.html" />
            </li>
          </ul>
        </template>

        <!-- Paragraphs (after the layout above, or on their own) -->
        <!-- eslint-disable-next-line vue/no-v-html — escaped by the case-study parser -->
        <p v-for="(p, i) in s.paragraphs" :key="`p${i}`" class="cs-p" v-html="p" />
      </div>
    </section>

    <!-- Screens -->
    <section v-if="screens.length > 1" class="cs-section is-gallery" aria-labelledby="cs-gallery">
      <h2 id="cs-gallery" class="cs-h2">Screens</h2>
      <div class="cs-gallery">
        <button
          v-for="(s, i) in screens"
          :key="s.src!"
          type="button"
          class="cs-thumb"
          :class="{ 'is-phone': s.mobile }"
          :aria-label="`Open ${s.label}`"
          @click="openShot(i, $event)"
        >
          <img :src="s.src!" alt="" loading="lazy" decoding="async" />
        </button>
      </div>
    </section>

    <!-- Closing -->
    <section class="cs-cta">
      <p class="cs-cta-line">Have a workflow like this? Let's talk.</p>
      <div class="cs-cta-actions">
        <a class="cs-cta-btn" href="/?to=contact" @click.prevent="toContact">Start a conversation</a>
        <a v-if="next" class="cs-next" :href="next.href" @click.prevent="toNext">Next project <span aria-hidden="true">→</span> {{ next.name }}</a>
      </div>
    </section>
    <ScenesWorkProjectLightbox ref="lightbox" />
  </main>
  <ScenesContactSiteFooter />
</template>

<style scoped>
.cs {
  --signal: #3b5bff;
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 var(--gutter);
  color: #16181d;
}

.cs-hero {
  padding: 22vh 0 10vh;
}

.cs-kicker {
  margin: 0 0 22px;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(22, 24, 29, 0.6);
}

.cs-title {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(56px, 9vw, 132px);
  line-height: 0.96;
  letter-spacing: -0.025em;
}

.cs-subtitle {
  max-width: 760px;
  margin: 28px 0 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-style: italic;
  font-size: clamp(22px, 2.4vw, 32px);
  line-height: 1.3;
  color: rgba(22, 24, 29, 0.8);
}

.cs-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 32px 0 0;
  padding: 0;
  list-style: none;
}

.cs-chips li {
  padding: 5px 11px;
  border: 1px solid rgba(22, 24, 29, 0.18);
  border-radius: 999px;
  font-family: var(--font-sans);
  font-size: 12px;
  color: rgba(22, 24, 29, 0.7);
}

.cs-shot {
  margin: 9vh 0 0;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: #fbfaf6;
  box-shadow: 0 50px 90px -60px rgba(22, 24, 29, 0.45);
}

.cs-shot img {
  display: block;
  width: 100%;
  height: auto;
}

/* Sections: heading left, content right — generous space, hairline above each. */
.cs-section {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
  gap: 4vw;
  padding: 11vh 0;
  border-top: 1px solid rgba(22, 24, 29, 0.12);
}

.cs-section.is-lifecycle,
.cs-section.is-gallery {
  grid-template-columns: 1fr;
  gap: 6vh;
}

.cs-h2 {
  margin: 0;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(32px, 3.4vw, 48px);
  line-height: 1.05;
  letter-spacing: -0.015em;
}

.cs-body {
  min-width: 0;
}

.cs-p {
  max-width: 680px;
  margin: 0 0 18px;
  font-family: var(--font-sans);
  font-size: 18px;
  line-height: 1.6;
}

.cs-p:first-child {
  font-size: 20px;
}

.cs-modules + .cs-p,
.cs-roles + .cs-p,
.cs-list + .cs-p {
  margin-top: 32px;
}

.cs-pending {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(22, 24, 29, 0.5);
}

/* What we built: an editorial two-column list, not cards. */
.cs-modules {
  margin: 0;
  border-top: 1px solid rgba(22, 24, 29, 0.12);
}

.cs-module {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: 24px;
  padding: 20px 0;
  border-bottom: 1px solid rgba(22, 24, 29, 0.12);
}

.cs-module dt {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 24px;
  line-height: 1.15;
}

.cs-module dd {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: rgba(22, 24, 29, 0.74);
}

.cs-roles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 32px;
}

.cs-role h3 {
  margin: 0 0 10px;
  padding-top: 14px;
  border-top: 2px solid var(--signal);
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 28px;
}

.cs-role p {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: rgba(22, 24, 29, 0.74);
}

.cs-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.cs-list li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 18px 0;
  border-bottom: 1px solid rgba(22, 24, 29, 0.12);
  font-family: var(--font-sans);
  font-size: 15px;
  line-height: 1.6;
  color: rgba(22, 24, 29, 0.74);
}

.cs-list strong {
  font-family: var(--font-display);
  font-weight: 300;
  font-size: 24px;
  color: #16181d;
}

.cs-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 28px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(24px, 2.4vw, 34px);
}

.cs-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  align-items: start;
}

.cs-thumb {
  overflow: hidden;
  padding: 0;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: #fbfaf6;
  cursor: zoom-in;
  transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}

.cs-thumb:hover,
.cs-thumb:focus-visible {
  transform: translateY(-4px);
}

.cs-thumb.is-phone {
  max-width: 260px;
  border: 6px solid #111214;
  border-radius: 30px;
}

.cs-thumb img {
  display: block;
  width: 100%;
  height: auto;
}

.cs-cta {
  padding: 16vh 0 18vh;
  border-top: 1px solid rgba(22, 24, 29, 0.12);
}

.cs-cta-line {
  max-width: 900px;
  margin: 0 0 48px;
  font-family: var(--font-display);
  font-weight: 300;
  font-size: clamp(40px, 5.4vw, 80px);
  line-height: 1.02;
  letter-spacing: -0.02em;
}

.cs-cta-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 32px;
}

.cs-cta-btn {
  padding: 14px 26px;
  border-radius: 999px;
  background: #16181d;
  color: #f1eee7;
  font-family: var(--font-sans);
  font-size: 15px;
  text-decoration: none;
}

.cs-next {
  font-family: var(--font-sans);
  font-size: 15px;
  color: #16181d;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  padding-bottom: 2px;
}

@media (max-width: 900px) {
  .cs-section {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 8vh 0;
  }

  .cs-module {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .cs-roles {
    grid-template-columns: 1fr;
  }
}
</style>
