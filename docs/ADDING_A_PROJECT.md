# Adding a project

A project appears in two places at once: as a **tab** in "View our projects" on the homepage, and as
its own **case-study page** at `/work/<slug>`. You only add files — no code to write.

Pick a short **slug** first: lowercase words joined with hyphens, e.g. `project-assembly-track`.
It becomes the page address (`/work/project-assembly-track`) and the name of the folders and files below.

---

## 1. Add the screenshots

Create the folder `public/media/projects/<slug>/` and put the screenshots in it, numbered in the order
you want them shown:

```
public/media/projects/project-assembly-track/
  01.png
  02.png
  03.png
  04-mobile.png      ← "-mobile" shows it in a phone frame (portrait images get one anyway)
```

- Desktop screens: 2880×1800 PNG (or WebP), ideally under 400 KB each.
- Phone screens: 1170×2532 PNG (or WebP).
- **Only real screens, with demo or redacted data** — no client names, prices, people or number plates
  unless the client has agreed.
- `01.png` is the big image at the top of the case-study page.

## 2. Write the case-study text

Create `docs/case-studies/<slug>.md` by copying the template below. Keep the headings you need, delete
the ones you don't (heading included). A heading left empty shows a discreet "Section in progress"
note on the page.

Formatting rules (that's all there is):
- A line starting with `## ` starts a section.
- A blank line separates paragraphs. `**bold**` makes text bold.
- A line starting with `- ` is a list item. `- Label: text` gives the item a label.
- In "Actions that update each other", write each item as `- Something happens → New status`.

Some headings get a special layout automatically: a heading containing **lifecycle** or **workflow**
becomes the blue line with stages; **What we built** becomes a two-column list; **Actions that update
each other** becomes the animated sequence; **Roles** becomes role columns; **Stack** becomes an inline
list. Any other heading is shown as text and lists.

### Template — copy into `docs/case-studies/<slug>.md`

```markdown
---
title: Project name
client: Client name (or leave empty)
subtitle: One sentence that says what it is, shown under the title.
description: One or two sentences for Google and link previews (under 160 characters).
---

## The problem

What was hard before. One or two short paragraphs.

## The workflow

- First stage: one sentence about it.
- Second stage: one sentence about it.
- Third stage: one sentence about it.

## What we built

- Module name: what it does, in one or two sentences.
- Another module: what it does.

## Actions that update each other

- Something happens → New status
- Another thing happens → Another status

## Roles & security

- Role one: what this role can see and do.
- Role two: what this role can see and do.

One paragraph about how access is protected.

## Built for the floor

- Point: short explanation.
- Point: short explanation.

## Stack

- Technology one
- Technology two
```

## 3. Add one entry to `app/data/projects.ts`

Open `app/data/projects.ts`, find the list called `entries`, and add your project at the end
(copy this, then change the values):

```ts
  {
    slug: 'project-assembly-track',
    name: 'Project Assembly Track',
    client: 'Client name',
    oneLiner: 'One sentence shown next to the screens on the homepage.',
    chips: ['First scope', 'Second scope', 'Third scope'],
    caseStudy: 'project-assembly-track.md',
  },
```

Mind the commas and quotes: each value in single quotes, a comma after each line and after the closing
`},`. The order of entries is the order of the tabs.

## 4. That's it

Run the site (`npm run dev`) or deploy it: the new tab appears in "View our projects", its screens
stream past, "View case study →" opens `/work/<slug>`, and the previous project's "Next project →"
now leads to it. Nothing else to change.

---

**Check before publishing:** open `/work/<slug>`, read it through, click each screenshot (it opens
large), and try the page on a phone.
