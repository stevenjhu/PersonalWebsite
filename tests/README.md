# Test suite

Two layers of automated testing cover the contact feature: unit tests for isolated logic and E2E tests for the integrated, in-browser experience.

Run all tests:

```bash
npm test                # unit + E2E
npm run test:unit       # Vitest only
npm run test:e2e        # Playwright only
```

---

## Unit tests — `unit/contact-form.test.tsx`

Tests the `ContactForm` React component in isolation using jsdom + React Testing Library. `fetch` is stubbed with Vitest; no real network calls are made.

### Section 1 — Client-side validation

| ID | Test |
|----|------|
| 1.1 | Shows "Please fill in all fields." and fires no `fetch` when all fields are empty |
| 1.2 | Shows "Please fill in all fields." and fires no `fetch` when only name is filled |
| 1.3 | Shows "Please fill in all fields." and fires no `fetch` when name + email are filled but message is empty |
| 1.4 | Shows "Please enter a valid email address." for `notanemail` |
| 1.5 | Shows "Please enter a valid email address." for `a@b` (no TLD) |
| 1.6 | Passes validation for `user@domain.com` and fires `fetch` |
| 1.7 | Button text changes to "Sending…" and becomes disabled while the request is in-flight |

### Section 2 — Honeypot

| ID | Test |
|----|------|
| 2.1 | Submits normally and calls `fetch` when the hidden company field is empty |
| 2.2 | Shows success card and does **not** call `fetch` when the honeypot field is filled |

### Section 8 — UI state machine

| ID | Test |
|----|------|
| 8.2 | Renders success card (`role="status"`) and "Thanks" message after a 200 response |
| 8.3 | Renders error alert (`role="alert"`) with the server's message and re-enables the submit button after a 500 response |
| 8.4 | Renders cap card with a `mailto:` link after a 503 `EMAIL_CAP_REACHED` response |
| 8.5 | Renders error alert with the error message on a network failure (fetch throws) |

---

## Unit tests — `unit/contact-api.test.ts`

Tests the `POST /api/contact` Cloudflare Worker handler directly, bypassing the HTTP layer. The handler is a thin proxy, so the upstream `fetch` to the Azure Function is stubbed and the Cloudflare `env` binding is mocked. Input validation, rate limiting, and Resend delivery live in the Azure Function and are covered in that service's own repository.

### Section 3 — Request forwarding

| ID | Test |
|----|------|
| 3.1 | Forwards a `POST` to `AZURE_CONTACT_URL` with `Content-Type: application/json` and the `X-Internal-Secret` header taken from `env` |
| 3.2 | Passes the request body through to Azure unchanged |

### Section 4 — Response pass-through

| ID | Test |
|----|------|
| 4.1 | Returns Azure's 200 status and `{ ok: true }` body |
| 4.2 | Passes through a 400 validation error from Azure |
| 4.3 | Passes through a 429 rate-limit response from Azure |
| 4.4 | Passes through a 503 `{ error: "EMAIL_CAP_REACHED" }` response from Azure |
| 4.5 | Always responds with `Content-Type: application/json`, verified on a 502 upstream failure |

---

## E2E tests — `e2e/contact.spec.ts`

Full browser tests using Playwright (Chromium). The Astro dev server is started automatically. `/api/contact` is intercepted by Playwright's `page.route()`, so no real emails are sent. The helper `gotoContactForm` scrolls the contact section into view to trigger Astro's `client:visible` hydration and waits for `form[data-hydrated]` (set by `useEffect` after React mounts) before interacting.

### Section 1 — Client-side validation (browser)

| ID | Test |
|----|------|
| 1.1 | Clicking submit with all fields empty shows `role="alert"` containing "Please fill in all fields." without making a network request |
| 1.4 | Filling an invalid email and submitting shows `role="alert"` containing "Please enter a valid email address." |

### Section 2 — Honeypot (browser)

| ID | Test |
|----|------|
| 2.2 | Setting the hidden `company` input via JS and submitting shows `role="status"` without making a network request |

### Section 8 — UI state machine (browser)

| ID | Test |
|----|------|
| 8.1 | Submit button shows "Sending…" text and is `disabled` while the mocked request is in-flight (400 ms delay) |
| 8.3 | A mocked 500 response shows `role="alert"` containing "Server error" and the submit button is re-enabled |
| 8.4 | A mocked 503 `EMAIL_CAP_REACHED` response shows `role="status"` containing "temporarily unavailable" and a `mailto:` link |

### Section 9 — Happy path (browser)

| ID | Test |
|----|------|
| 9 | A valid submission against a mocked 200 response shows `role="status"` and "Thanks" text |
