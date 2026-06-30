# Test suite

Two layers of automated testing cover the contact feature — unit tests for isolated logic and E2E tests for the integrated, in-browser experience.

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

Tests the `POST /api/contact` Cloudflare Worker handler directly, bypassing the HTTP layer. Resend (`fetch`) is stubbed; the Cloudflare `env` binding is mocked.

### Section 3 — Server-side input validation

| ID | Test |
|----|------|
| 3.1 | Returns 400 `{ error: "Invalid JSON body." }` for malformed JSON |
| 3.2 | Returns 400 `{ error: "All fields are required." }` for an empty payload `{}` |
| 3.3 | Returns 400 for an empty `name` string |
| 3.4 | Returns 400 `{ error: "Please provide a valid email address." }` for a bad email |
| 3.5 | Returns 400 for an email exceeding 254 characters |
| 3.6 | Returns 400 `{ error: "Input too long." }` for a message exceeding 5 000 characters |
| 3.7 | Returns 400 `{ error: "Input too long." }` for a name exceeding 200 characters |
| 3.8 | Returns 200 `{ ok: true }` for a fully valid request with no `company` field |
| 3.9 | Returns 200 for a valid request with an empty `company` field |
| 3.10 | Returns 200 without calling Resend when the honeypot `company` field is non-empty (silent accept) |

### Section 4 — Rate limiting

| ID | Test |
|----|------|
| 4.1 | Allows the first 5 requests from the same IP |
| 4.2 | Blocks the 6th request from the same IP within the window (returns 429) |
| 4.4 | Allows a different IP when another IP is rate-limited |

### Section 5 — Environment variable guards

| ID | Test |
|----|------|
| 5.1 | Returns 500 `{ error: "Email service is not configured." }` when `RESEND_API_KEY` is absent |
| 5.2 | Returns 500 when `CONTACT_TO` is absent |
| 5.3 | Returns 500 when `CONTACT_FROM` is absent |

### Section 6 — Resend API integration

| ID | Test |
|----|------|
| 6.1 | Returns 200 and `POST`s to `https://api.resend.com/emails` for a valid request |
| 6.1b | Sends the correct payload to Resend: `from`, `to`, `reply_to`, `subject`, and plain-text `body` |
| 6.2 | Returns 502 when Resend responds with 401 (invalid key) |
| 6.4 | Returns 503 `{ error: "EMAIL_CAP_REACHED" }` when Resend responds with 429 |
| 6.5 | Returns 500 when `fetch` throws a network error |

---

## E2E tests — `e2e/contact.spec.ts`

Full browser tests using Playwright (Chromium). The Astro dev server is started automatically. `/api/contact` is intercepted by Playwright's `page.route()` — no real emails are sent. The helper `gotoContactForm` scrolls the contact section into view to trigger Astro's `client:visible` hydration and waits for `form[data-hydrated]` (set by `useEffect` after React mounts) before interacting.

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
