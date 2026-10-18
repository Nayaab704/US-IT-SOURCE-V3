# US IT Source — Art Direction (source of truth)

This document is decided by the project owner. The coding agent implements it and does not change it. Anything marked **[TBD]** must be asked about, not invented.

---

## 1. Master idea: "Built to fit"

We don't change how a business works — we build software that follows it.

Two recurring visual motifs:

- **The Piece** — precision-cut flat parts (like sheet material cut for nesting) that fit together exactly. Born in the hero, reappear in the Material Nesting chapter and the Contact scene.
- **The Line** — the client's real workflow. It starts hand-drawn and messy, then becomes engineered and precise **while keeping the same shape**.

Two atmospheres that alternate:

- **Night** — deep ink-blue, cinematic, rendered light in atmosphere (WebGL). Premium, Fantasy-like dynamic range. Text crisp and luminous through contrast, never glow.
- **Day** — warm paper and ink, editorial, human. Calm. Light moves across it like window shadow.

Moving between night and day *is* a transition.

---

## 2. Design tokens

### Color
| Token | Value | Use |
|---|---|---|
| `--night-0` | `#04060C` | deepest black-blue |
| `--night-1` | `#0A1222` | base night |
| `--night-2` | `#18284A` | lit night |
| `--night-light` | `#4A6BA3` | light volumes in fog (WebGL) |
| `--night-violet` | `#3D10E9` | hero atmosphere upper field (owner-tuned, 2026-10-18) |
| `--night-light-violet` | `#1E0EDC` | hero atmosphere key light (owner-tuned, 2026-10-18) |
| `--night-text` | `#F2F1EC` | primary text on night |
| `--night-muted` | `#8B93A3` | labels on night |
| `--paper` | `#F1EEE7` | day ground |
| `--paper-raised` | `#FBFAF6` | chips/cards on paper |
| `--ink` | `#16181D` | text on day |
| `--ink-muted` | `#6B655B` | labels on day |
| `--signal` | `#D9481F` | the hand-drawn line ONLY (vermilion). Never used as a general accent. |

Materials (WebGL): brushed aluminium, matte ceramic (`#F1EFEA` base), graphite, anodized ink-blue, warm sand.

### Type
- **Geist** (300/400/500/600) — primary UI and night headlines.
- **Instrument Serif** (regular + italic) — editorial headlines on day scenes, project titles, human moments.
- **Geist Mono** (400/500) — small technical labels, section indexes (`02 — THE WAY YOU ACTUALLY WORK`), tracked +0.14–0.16em, uppercase.
- Self-host fonts (`@nuxt/fonts` or local files). No Inter/Roboto/Arial.

### Layout
- Desktop reference frame 1440×900. Side gutter 56px desktop, 20px mobile.
- Each homepage scene is a full-viewport **scene**, many pinned (sticky) — not ordinary stacked sections.

---

## 3. Motion system

- **Level 1 — always alive, almost invisible:** atmospheric drift, slow light movement, subtle cursor response, fine animated grain.
- **Level 2 — scroll choreography:** reveals, line drawing, type transitions, card transforms.
- **Level 3 — signature (only these four):** Hero pieces/assembly, Services deck, Vision lens, Contact pieces bookend.

### Feel
- Easing default: `power3.out` for entrances, `power2.inOut` for scrubbed transforms. No bounce, no elastic, no back easing.
- **Thick-fluid feel** (cursor & objects): cursor follow lerp ≈ 0.08–0.12 per frame; objects react to cursor **velocity**, high linear drag, very low restitution, slow angular damping. Things drift and settle — they never bounce like toys.

### Signature transition: text passing behind glass
Outgoing text does **not** just fade. As a line of text rises past an invisible frosted-glass horizon (≈ top 18–25% of the viewport):
1. it blurs progressively **line by line** (0 → ~10px), not all at once;
2. a very slight vertical stretch and refraction offset (1–3px) as it crosses;
3. a faint chromatic split on the edges (WebGL version only);
4. it dims to ~0 as if behind something;
5. a barely visible highlight line marks the glass edge only while text crosses it.
Two implementations: **HTML version** (used broadly) and **WebGL version** (hero/key night scenes, real refraction).

### Signature transition: the drawn line (page transitions)
Entering a case study, service page or About: a medium-thick line (8–14px at 1440w, slightly tapered ends) sweeps across the screen in a confident half-curve, then settles and becomes part of the new page (title underline / divider / that project's workflow path). Colors: `--signal` on day pages, `--night-text` on night pages.

---

## 4. Homepage scenes (in order)

### 1A — Hero: pieces in fluid (Night · SIGNATURE)
- WebGL atmosphere: fog + 2–3 soft light volumes, slow noise drift, tone-mapped, dithered, grain.
- ~30 thin extruded pieces (letterform fragments of the logotype), aluminium + ceramic materials, environment reflections, depth of field on distant pieces.
- Cursor pushes pieces through a viscous medium.
- Copy: nav + small intro line + `SCROLL TO ASSEMBLE`.

### 1B — Hero: built to fit
- Scroll: pieces glide and nest into the **US IT SOURCE** logotype; seams close with a light sweep.
- Headline: **"Technology built around the way your business works."**
- Services line (mono): SOFTWARE & APPS · AI MODELING · COMPUTER VISION · STAFF AUGMENTATION · TRAINING
- Exit: camera pushes into the **O**; its counter holds warm daylight and becomes the aperture into Scene 2.
- **[TBD] Logotype** must be designed before this scene is built. Until then use a placeholder outline.

### 2 — The way you actually work (Day · QUIET)
- Headline (serif): "Every business has its own way of working." Sub: "Most software ignores it. We start by learning it."
- Vermilion hand line draws with scroll, looping between labels: customer calls · whiteboard · spreadsheet_v7_FINAL · text the vendor · paper PO (lost?) · "who has the keys?" · invoice.
- Cursor: hold & drag draws a wet-ink line that fades after ~3s.

### 3 — How we work (Day · Level 2, pinned)
Steps (approved):
1. **Sit with the work** — we spend time with the people doing the job and collect what they use today.
2. **Map the flow** — every step, handoff and exception; the client signs off: "yes, this is how we work."
3. **Build to the map** — apps, trackers and dashboards follow the map exactly: your words, your fields, your order of steps.
4. **Run it, then grow it** — roll out, train, adjust as the business changes.
- The hand line becomes an engineered line with the **same shape**; labels become interface chips (Intake · Work order · Parts request · Purchase order · Labor · Delivered); faint ghost of the original remains.
- Step 4: a light pulse travels the line; a new branch grows (Third-party repair).
- Closing line: "You work A → D → B → F. Your software works A → D → B → F."
- Exit: the line folds into a rectangle → first card of the deck.

### 4 — Services deck (Night · SIGNATURE)
Five cards, five materials: 01 Software & Applications (graphite) · 02 AI Modeling (aluminium) · 03 Computer Vision & ML (ceramic) · 04 Staff Augmentation (anodized ink-blue) · 05 Technical Training (warm sand).
- Starts as one thick stack → lifts and tilts to show thickness → fans → each card turns to face viewer → final arrangement.
- Hover: card tilts toward cursor, light slides across surface.
- WebGL cards, SDF text, hidden HTML. Fallback: CSS 3D.
- Headline: "Five ways we fit around you."

### 5 — Selected work (Night · Level 2+)
- Vertical scroll drives horizontal chapters, one per project (must scale to N projects).
- 01 Garage Automation (work-order line through Intake → Work order → Parts → Vendor·PO → Labor → Done; layered real screens). 02 Material Nesting Software (hero pieces nest onto a sheet). 03 Project Assembly Track (stages assemble; progress line).
- Real redacted screenshots/recordings only — **[TBD] assets**.
- Hover: liquid ripple on media; cursor becomes "View". Click: media expands into the case-study page.

### 6 — Vision & AI (Night · SIGNATURE)
- Full-bleed real project photography **[TBD]**.
- Cursor is a thick-glass lens: only inside it are outlines, labels and measurements visible. Rim refracts slightly.
- Headline (serif): "AI is useful when it's built for a job you actually have."
- Mobile: automatic scan sweep.

### 7 — People (Day · QUIET, deliberately)
- "Your team, extended." / "Your team, trained." — the line underlines *extended*, circles *trained*.
- Staff Augmentation: "Engineers who join your team, use your tools and follow your process."
- Technical Training: "Hands-on training that leaves your people confident with the systems they run every day."
- Link: About US IT Source →

### 8 — Conversation (Night · BOOKEND)
- "Tell us how your business works." / "We'll show you what software built around it could look like." / [Start a conversation]
- Pieces return as real 3D objects in fluid; cursor pushes them; hovering the CTA draws them into a slow orbit around it; clicking snaps them together into a complete shape before the form opens.
- Footer: [EMAIL] · [LOCATION] · LinkedIn · © US IT Source.

---

## 5. Never

Generic AI-agency look · neural-network dots · floating cubes · random glassmorphism · fake dashboards · decorative phones/laptops · cybersecurity visual language · stock photography walls · grids of boring cards · PowerPoint transitions · WebGL for its own sake · invented clients, metrics, testimonials, awards.
