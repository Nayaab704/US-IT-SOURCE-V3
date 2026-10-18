# US IT Source — Project rules for the coding agent

You are the **implementer** on this project. The art direction, UX and copy are decided by the project owner and documented in `docs/ART_DIRECTION.md`. Read that file before any visual work.

You do **not** invent art direction, layouts, colors, copy, client names, metrics, testimonials or logos. If something visual or textual is not specified, **stop and ask**, or use a clearly marked placeholder like `[PLACEHOLDER: work order screenshot]`.

---

## The company (one paragraph)

US IT Source is a technology consulting and engineering company. It learns how a client's business actually operates and builds custom software, AI and computer-vision systems around that exact workflow ("if you work X → Y → Z, the software works X → Y → Z"). It also provides staff augmentation and technical training. It is **not** a SaaS product, AI startup, cybersecurity company or hardware brand. Real projects: Garage Automation, Material Nesting Software, Project Assembly Track.

---

## Development environment

- **Windows**, terminal is **PowerShell** inside VS Code. Write every command you suggest or run for PowerShell:
  - chain commands with `;` (not `&&`, which fails in Windows PowerShell 5.1),
  - use PowerShell syntax for env vars (`$env:NAME = "value"`), paths with `\` where it matters, `Remove-Item` instead of `rm -rf`.
- Never rely on bash-only scripts in `package.json`. npm scripts must work on Windows (use cross-platform tools if needed).
- Line endings: keep the repo consistent (add a `.gitattributes` with `* text=auto eol=lf` in Phase 0).

---

## Workflow — non-negotiable

1. **One phase at a time.** Only build what the current prompt asks for. Never build ahead.
2. **Plan first.** For any phase, present a short plan (files you will create/change, libraries, risks) before writing code, unless the prompt says to skip planning.
3. **Build in isolation first.** New experiences are built on a lab route (`/lab/<name>`) before they are placed on the homepage.
4. **Verify before reporting.** Run `npm run dev` (must start without errors), `npx nuxi typecheck` (must pass), and fix all console errors/warnings you caused.
5. **Report, then stop.** End every phase with:
   - what you built (files),
   - the exact URL(s) to review in the browser,
   - what to look at / interact with,
   - known limitations,
   - tweakable parameters and where they live.
   Then **stop and wait** for feedback.
6. **Never commit on your own.** Only commit when the owner writes **"approved"**. Then:
   `git add -A; git commit -m "<phase>: <meaningful summary>"` and push if a remote exists.
   Never describe anything as "approved" before the owner says so.
7. **Never** use `--force`, `--legacy-peer-deps`, or silence engine warnings to "make it work". Diagnose and report instead.

---

## Tech stack — fixed

- **Nuxt 4 + Vue 3 + TypeScript** (strict). No React, no Next, no JSX.
- **GSAP** (core + ScrollTrigger; other GSAP plugins such as SplitText / DrawSVG / MorphSVG are allowed — they are free in current GSAP).
- **Lenis** for smooth scroll, synced to GSAP: drive Lenis from `gsap.ticker`, call `ScrollTrigger.update` on Lenis scroll, `gsap.ticker.lagSmoothing(0)`.
- **Three.js** for WebGL. `troika-three-text` for SDF text inside WebGL when needed.
- **SVG + GSAP** for line drawing. **CSS** for layout. **Canvas 2D** only when it is clearly simpler.
- Physics: custom damped simulation first. Add Rapier only if asked.
- Dev-only tuning UI: **Tweakpane**, never shipped in production builds.

Use the simplest technology that reaches the specified quality. Do not use WebGL for something SVG/CSS can do equally well.

---

## Architecture rules

- **One WebGL renderer for the whole site** (`components/stage/`): a single fixed full-screen canvas behind the DOM. Scenes register with the stage; only the active scene(s) render. Never create a second `WebGLRenderer`.
- Render loop runs on `gsap.ticker`. Pause rendering when the tab is hidden or no scene is visible.
- **DPR cap:** `min(devicePixelRatio, 1.5)` desktop, `1` on mobile/low-power.
- All browser/WebGL code is **client-only** (`.client.vue`, `onMounted`, or `import.meta.client`). SSR must not break.
- **Every effect cleans up**: `gsap.context()` + `ctx.revert()` on unmount, kill ScrollTriggers, dispose geometries/materials/textures/render targets, remove listeners.
- **Reduced motion** (`prefers-reduced-motion`): every experience has a static, well-composed fallback. Use the shared `useReducedMotion()` composable.
- **Mobile** (`< 768px` or coarse pointer): a deliberately simplified version, specified per scene in the art direction doc. Never just shrink desktop.
- Text the user reads stays **real HTML** (SEO + accessibility). If text is also rendered in WebGL, keep a visually-hidden HTML copy.
- Lab routes (`/lab/*`) must not be reachable in production builds.

## Folder structure

```
app/
  assets/css/        tokens.css (design tokens), base.css
  components/
    stage/           WebGL stage + scene registry
    scenes/          one folder per homepage scene (hero, problems, approach, services, work, vision, people, contact)
    ui/              nav, buttons, cursor, glass-text, etc.
  composables/       useLenis, useReducedMotion, useStage, usePointer, useDevice
  pages/
    index.vue
    lab/             isolated experiments (dev only)
  plugins/           gsap.client.ts, lenis.client.ts
  utils/
    shaders/         .glsl files (vertex/fragment), shared chunks (noise, tonemap, dither)
docs/
  ART_DIRECTION.md
public/
```

## Performance budget

- 60 fps on a mid-range laptop with integrated graphics at 1440×900.
- Keep total WebGL draw calls per frame low (instancing for repeated pieces).
- No texture larger than 2048 px without a reason. Compress assets.
- Initial JS for the homepage: keep Three.js and scene code lazily loaded where possible.

## Code style

- Small, named, typed modules. Parameters that affect the look (speeds, damping, colors, intensities) live in a single `params` object per scene, exported, and wired to Tweakpane in dev.
- Comment the *why*, not the *what*.
- No new dependencies without saying why in the plan.
