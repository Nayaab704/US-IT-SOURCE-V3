# Deploying to Vercel

The site is a standard Nuxt 4 app. Vercel detects it automatically — no configuration file, no
environment variables and no secrets are needed.

## First deployment

1. Push the latest work to GitHub (the repository `Nayaab704/US-IT-SOURCE-V3`, branch `main`).
2. Go to **vercel.com → Add New… → Project**, sign in with GitHub and **Import** the repository.
3. Vercel shows the settings it detected. Leave them as they are:
   - Framework Preset: **Nuxt.js**
   - Build Command: `npm run build` (default)
   - Output Directory: leave empty (Nuxt sets it)
   - Install Command: `npm install` (default)
   - Node.js version (Settings → General): **20.x or newer**
4. Click **Deploy**. After a couple of minutes Vercel gives you a URL such as
   `https://us-it-source-v3.vercel.app`.

## Every change after that

- Every push to `main` deploys to **production** automatically.
- Every push to another branch (or pull request) gets its own **preview** URL — handy for reviewing a
  change before it goes live.

## Your own domain

1. In the Vercel project: **Settings → Domains → Add**, type the domain (e.g. `usitsource.com`).
2. Vercel shows the DNS records to add at your domain registrar (an `A` record for the bare domain and
   a `CNAME` for `www`). Add them; HTTPS is set up automatically.
3. Once the domain is live, add it to the site's meta tags (canonical URL / `og:url`) — see
   `docs/PLACEHOLDERS.md` ("Domain / canonical URL").

## Good to know

- Lab pages (`/lab/...`) are development-only and are not part of the production build.
- The developer panel and stats readout only exist in development (`npm run dev`, with `?debug` in the
  URL); visitors never see them.
- Images and videos are served from `public/`; adding a project only needs new files and one entry
  (see `docs/ADDING_A_PROJECT.md`), then a push.
- To check a production build locally before pushing:
  ```
  npm run build
  npm run preview
  ```
  then open the address it prints.
