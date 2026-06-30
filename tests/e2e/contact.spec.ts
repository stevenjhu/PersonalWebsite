import { test, expect, type Page } from "@playwright/test";

// ── Helpers ────────────────────────────────────────────────────────────────

async function gotoContactForm(page: Page) {
  await page.goto("/");
  // Scroll the section into the viewport to trigger client:visible hydration.
  await page.locator("#contact").scrollIntoViewIfNeeded();
  // Wait for React to hydrate the form — data-hydrated is set by useEffect, so it
  // only appears after React has attached its event handlers (never from SSR alone).
  await expect(page.locator("form[data-hydrated]")).toBeVisible({ timeout: 15_000 });
}

async function fillForm(
  page: Page,
  {
    name = "Alice Test",
    email = "alice@example.com",
    message = "Hello, this is a test message.",
  } = {},
) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Message").fill(message);
}

// ── Tests ──────────────────────────────────────────────────────────────────

test.describe("Contact Form E2E", () => {
  test.beforeEach(async ({ page }) => {
    await gotoContactForm(page);
  });

  // Section 9: Full end-to-end happy path (API mocked to avoid real emails)
  test("9 – success card appears after valid submission", async ({ page }) => {
    await page.route("/api/contact", (route) =>
      route.fulfill({ json: { ok: true } }),
    );

    await fillForm(page);
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByText(/thanks/i)).toBeVisible();
  });

  // Section 8.1: Sending… button state
  test("8.1 – button shows 'Sending…' and is disabled while request is in-flight", async ({
    page,
  }) => {
    await page.route("/api/contact", async (route) => {
      await new Promise((r) => setTimeout(r, 400));
      await route.fulfill({ json: { ok: true } });
    });

    await fillForm(page);
    await page.getByRole("button", { name: /send message/i }).click();

    const btn = page.getByRole("button", { name: /sending/i });
    await expect(btn).toBeVisible();
    await expect(btn).toBeDisabled();
  });

  // Section 8.3: Error response keeps form editable
  test("8.3 – error message shown and form stays editable on server error", async ({
    page,
  }) => {
    await page.route("/api/contact", (route) =>
      route.fulfill({ status: 500, json: { error: "Server error" } }),
    );

    await fillForm(page);
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("alert")).toContainText("Server error");
    await expect(
      page.getByRole("button", { name: /send message/i }),
    ).not.toBeDisabled();
  });

  // Section 8.4: EMAIL_CAP_REACHED shows cap card with email link
  test("8.4 – cap card with direct email link shown on EMAIL_CAP_REACHED", async ({
    page,
  }) => {
    await page.route("/api/contact", (route) =>
      route.fulfill({ status: 503, json: { error: "EMAIL_CAP_REACHED" } }),
    );

    await fillForm(page);
    await page.getByRole("button", { name: /send message/i }).click();

    const card = page.getByRole("status");
    await expect(card).toBeVisible();
    await expect(card.getByText(/temporarily unavailable/i)).toBeVisible();
    await expect(card.getByRole("link")).toHaveAttribute("href", /^mailto:/);
  });

  // Section 1.1: Client-side validation — all empty
  test("1.1 – shows validation error and fires no request when all fields empty", async ({
    page,
  }) => {
    await page.route("/api/contact", (route) => route.abort());

    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Please fill in all fields.",
    );
  });

  // Section 1.4: Client-side validation — invalid email
  test("1.4 – shows email error for invalid email address", async ({ page }) => {
    await page.route("/api/contact", (route) => route.abort());

    await fillForm(page, { email: "notanemail" });
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("alert")).toContainText(
      "Please enter a valid email address.",
    );
  });

  // Section 2.2: Honeypot — bot-filled hidden field silently succeeds client-side
  test("2.2 – honeypot fill shows success without firing a network request", async ({
    page,
  }) => {
    // Track whether a real request was made.
    let requestFired = false;
    await page.route("/api/contact", (route) => {
      requestFired = true;
      route.abort();
    });

    await fillForm(page);
    // Fill the hidden honeypot field via JavaScript (hidden from real users).
    await page.evaluate(() => {
      const input = document.querySelector(
        'input[name="company"]',
      ) as HTMLInputElement | null;
      if (input) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value",
        )?.set;
        nativeInputValueSetter?.call(input, "Acme Corp");
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await page.getByRole("button", { name: /send message/i }).click();

    await expect(page.getByRole("status")).toBeVisible();
    expect(requestFired).toBe(false);
  });
});
