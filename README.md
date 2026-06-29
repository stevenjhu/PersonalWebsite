# shiqihu.com — Personal Portfolio

The code behind my corner of the internet — engineering work I'm proud of, photos I've taken, and a form you can use to reach me.

Built for speed: fully static HTML/CSS at load time, with JavaScript only where interaction is needed — powered by Astro and React islands, deployed on Cloudflare Workers with a serverless contact API and a Cloudflare R2 image pipeline.

## [→ Visit shiqihu.com](https://shiqihu.com)

## Table of contents

- [Tech stack](#tech-stack)
- [Key tradeoffs](#key-tradeoffs)
- [Architecture](#architecture)
- [Notable implementation details](#notable-implementation-details)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Configuration](#configuration)
- [License](#license)

## Tech stack

| Layer | Technology | Why |
| --- | --- | --- |
| Framework | **Astro 7** | Static-first, ships zero JavaScript by default; fast loads and strong SEO out of the box. |
| Interactivity | **React 19 islands** | Interactive pieces (theme toggle, gallery lightbox, contact form) hydrate independently — JS is scoped to where it's needed. |
| Language | **TypeScript (strict)** | End-to-end type safety across UI, data, and the serverless API. |
| Styling | **Tailwind CSS v4** | Utility-first styling with a single design-token source of truth (CSS variables) driving light/dark themes. |
| Animation | **Motion** | Subtle, accessible entrance and hover motion; respects `prefers-reduced-motion`. |
| Icons | **lucide-react** | Tree-shakeable SVG icon set. |
| Hosting & CI/CD | **Cloudflare Workers** | Global edge network, free SSL, deployed via `wrangler deploy` in GitHub Actions. |
| API | **Azure Functions (Node 20, TS)** | The `/api/contact` endpoint validates input, applies a honeypot + rate limit, and sends email. |
| Media | **Cloudflare R2** | S3-compatible object storage serving a responsive AVIF/WebP image pipeline for the photography gallery. |

## Key tradeoffs

**Astro over a React-based meta-framework (Next.js / Remix)**

A portfolio is almost entirely static content — the trade-off is straightforward. Next.js ships a JS runtime and hydrates the full page by default; every visitor pays that cost even when they're just reading text. Astro flips the default: pages are pure HTML/CSS, and JavaScript is opt-in per component via islands. The result is a significantly smaller JS bundle and faster Time to Interactive, with no meaningful loss of capability for this use case. React is still used where it earns its keep — the theme toggle, gallery lightbox, and contact form — but it doesn't come along for the ride everywhere else.

## Architecture

```mermaid
flowchart LR
    Visitor(["👤 Visitor"])

    subgraph CF["Cloudflare"]
        Worker["Workers (edge)\nAstro site"]
        PagesFunc["Pages Function\n/api/contact\n(proxy)"]
        R2["R2\nAVIF/WebP photos"]
    end

    subgraph AZ["Azure"]
        Func["Functions\n/api/contact"]
        Email["📧 Resend (email)"]
    end

    Visitor -- HTTPS --> Worker
    Visitor -- "POST /api/contact" --> PagesFunc
    Visitor -- "img srcset (direct)" --> R2
    PagesFunc -- "proxy + X-Internal-Secret" --> Func
    Func --> Email
```

- **Cloudflare Workers** serves the Astro-built site at the edge (`wrangler deploy`).
- **Cloudflare R2** hosts responsive AVIF/WebP photo variants; the browser fetches them directly via `<img srcset>` — no runtime image processing.
- **Azure Functions** is a separate deployment (`api/`) that handles contact form submissions, validates input, and sends email via Resend.

## Notable implementation details
**Contact form: hidden backend URL + shared secret**

The Azure Functions URL is never exposed in the client bundle or the repository. The contact form posts to `/api/contact`, which is handled by a Cloudflare Pages Function (`functions/api/contact.ts`). The Pages Function reads the real Azure Functions URL and a shared secret from Cloudflare's encrypted environment variables at runtime, injects the secret as an `X-Internal-Secret` header, and proxies the request. Azure Functions rejects any request that omits or provides the wrong secret — so even if someone discovers the Azure URL, they cannot use it.

**Spam protection**

Two layers defend the contact endpoint without requiring a CAPTCHA:

- *Honeypot field* — a hidden input is present in the form markup but invisible and unfocusable to real users. Bots that auto-fill forms trigger it; the server silently returns a 200 so bots don't learn they were caught.
- *In-memory rate limiter* — the Azure Function tracks submission timestamps per client IP and rejects requests that exceed a fixed threshold with a 429.

**Email cap fallback**

When the Resend API returns a 429 (monthly send limit reached), the server responds with a machine-readable `EMAIL_CAP_REACHED` error rather than a generic failure. The contact form detects this and renders a dedicated state that surfaces the author's direct email address, so the form degrading never leaves a visitor without a way to reach out.

## Project structure

```
src/
  components/   UI components (Astro) + React islands (.tsx)
  sections/     Page sections (Hero, About, Experience, Projects, Skills, Photography, Contact)
  layouts/      BaseLayout.astro (meta / OG / SEO, no-flash theme)
  data/         Content as typed data (profile, experience, projects, skills, photos)
  lib/          Helpers (responsive-image srcset, nav config)
  styles/       globals.css (Tailwind + design tokens)
  pages/        index.astro, 404.astro
api/            Azure Functions (contact endpoint)
scripts/        optimize-and-upload-photos.ts (sharp → AVIF/WebP → R2)
```

## Local deployment instruction

```bash
npm install
npm run dev        # start the dev server
```
Then open the website at your localhost.

**Resume**

Upload `resume.pdf` to the `resume` R2 bucket. The "Résumé" buttons on the site serve it via `/api/resume`.

**Photography**

1. Create a local `photos/` folder (git-ignored) and put your source images in it.
2. Fill in the R2 credentials in `.env` (see `.env.example`).
3. Run `npm run photos` to generate AVIF/WebP variants and upload them to Cloudflare R2.
4. Add an entry (base URL, dimensions, alt, caption) to `src/data/photos.ts`.

## Configuration

Runtime configuration is provided through environment variables (see `.env.example` for the variable names). Values are supplied via local `.env` for scripts; in production, Cloudflare Workers secrets are set via `wrangler secret put` and Azure Functions settings are configured in the Azure portal.

## License

See [LICENSE](LICENSE).
