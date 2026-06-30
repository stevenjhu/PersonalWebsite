import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:workers";
import { POST } from "../../src/pages/api/contact";

// Shared mutable env object — mutations here are visible inside the handler.
const mockEnv = env as Record<string, string | undefined>;

// Use unique IPs per test to avoid cross-test rate-limiter interference.
let ipSeed = 0;
const nextIp = () => `10.0.${Math.floor(ipSeed / 255)}.${ipSeed++ % 255}`;

function makeRequest(body: unknown, ip = nextIp()): Parameters<typeof POST>[0] {
  const bodyStr =
    typeof body === "string" ? body : JSON.stringify(body);
  return {
    request: new Request("http://localhost/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "cf-connecting-ip": ip,
      },
      body: bodyStr,
    }),
  } as Parameters<typeof POST>[0];
}

describe("POST /api/contact", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.keys(mockEnv).forEach((k) => delete mockEnv[k]);
    Object.assign(mockEnv, {
      RESEND_API_KEY: "test_key",
      CONTACT_TO: "admin@example.com",
      CONTACT_FROM: "noreply@example.com",
    });

    mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "email-123" }), { status: 200 }),
      );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Section 3: Input Validation ────────────────────────────────────────────

  describe("3 – input validation", () => {
    it("3.1 returns 400 for invalid JSON", async () => {
      const res = await POST(makeRequest("not json"));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid JSON body." });
    });

    it("3.2 returns 400 for empty payload ({})", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "All fields are required." });
    });

    it("3.3 returns 400 when name is empty string", async () => {
      const res = await POST(
        makeRequest({ name: "", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "All fields are required." });
    });

    it("3.4 returns 400 for invalid email format", async () => {
      const res = await POST(
        makeRequest({ name: "Test", email: "bademail", message: "hi" }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Please provide a valid email address.",
      });
    });

    it("3.5 returns 400 for email exceeding 254 chars", async () => {
      const res = await POST(
        makeRequest({
          name: "Test",
          email: "a".repeat(249) + "@b.com", // 249 + "@b.com"(6) = 255 > 254
          message: "hi",
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Please provide a valid email address.",
      });
    });

    it("3.6 returns 400 for message exceeding 5000 chars", async () => {
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "x".repeat(5001) }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Input too long." });
    });

    it("3.7 returns 400 for name exceeding 200 chars", async () => {
      const res = await POST(
        makeRequest({
          name: "x".repeat(201),
          email: "a@b.com",
          message: "hi",
        }),
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Input too long." });
    });

    it("3.8 returns 200 for fully valid request without company field", async () => {
      const res = await POST(
        makeRequest({ name: "Test", email: "test@example.com", message: "Hello" }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("3.9 returns 200 for valid request with empty company field", async () => {
      const res = await POST(
        makeRequest({
          name: "Test",
          email: "test@example.com",
          message: "Hello",
          company: "",
        }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
    });

    it("3.10 silently accepts honeypot-triggered request without calling Resend", async () => {
      const res = await POST(
        makeRequest({
          name: "Test",
          email: "test@example.com",
          message: "Hello",
          company: "Acme Corp",
        }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── Section 4: Rate Limiting ───────────────────────────────────────────────

  describe("4 – rate limiting", () => {
    it("4.1 allows first 5 requests from the same IP", async () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) {
        const res = await POST(
          makeRequest({ name: "Test", email: "a@b.com", message: "hi" }, ip),
        );
        expect(res.status).toBe(200);
      }
    });

    it("4.2 blocks the 6th request from the same IP within the window", async () => {
      const ip = nextIp();
      for (let i = 0; i < 5; i++) {
        await POST(
          makeRequest({ name: "Test", email: "a@b.com", message: "hi" }, ip),
        );
      }
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }, ip),
      );
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({
        error: "Too many requests. Please try again later.",
      });
    });

    it("4.4 allows a different IP when another IP is rate-limited", async () => {
      const blockedIp = nextIp();
      const otherIp = nextIp();
      for (let i = 0; i < 6; i++) {
        await POST(
          makeRequest({ name: "Test", email: "a@b.com", message: "hi" }, blockedIp),
        );
      }
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }, otherIp),
      );
      expect(res.status).toBe(200);
    });
  });

  // ── Section 5: Environment Variables ──────────────────────────────────────

  describe("5 – environment variables", () => {
    it("5.1 returns 500 when RESEND_API_KEY is missing", async () => {
      delete mockEnv.RESEND_API_KEY;
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Email service is not configured.",
      });
    });

    it("5.2 returns 500 when CONTACT_TO is missing", async () => {
      delete mockEnv.CONTACT_TO;
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Email service is not configured.",
      });
    });

    it("5.3 returns 500 when CONTACT_FROM is missing", async () => {
      delete mockEnv.CONTACT_FROM;
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Email service is not configured.",
      });
    });
  });

  // ── Section 6: Resend API Integration ─────────────────────────────────────

  describe("6 – Resend API integration", () => {
    it("6.1 returns 200 and calls Resend when all inputs are valid", async () => {
      const res = await POST(
        makeRequest({ name: "Alice", email: "alice@example.com", message: "Hello" }),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("6.1 sends correct payload to Resend (subject, reply-to, body)", async () => {
      await POST(
        makeRequest({
          name: "Alice",
          email: "alice@example.com",
          message: "Hello there",
        }),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.resend.com/emails",
        expect.objectContaining({
          body: JSON.stringify({
            from: "noreply@example.com",
            to: "admin@example.com",
            reply_to: "alice@example.com",
            subject: "Portfolio contact from Alice",
            text: "From: Alice <alice@example.com>\n\nHello there",
          }),
        }),
      );
    });

    it("6.2 returns 502 when Resend returns 401 (invalid key)", async () => {
      mockFetch.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({
        error: "Failed to send message. Please try again.",
      });
    });

    it("6.4 returns 503 with EMAIL_CAP_REACHED when Resend returns 429", async () => {
      mockFetch.mockResolvedValue(
        new Response("Rate limited", { status: 429 }),
      );
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "EMAIL_CAP_REACHED" });
    });

    it("6.5 returns 500 when fetch throws (network error)", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));
      const res = await POST(
        makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
      );
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({
        error: "Failed to send message. Please try again.",
      });
    });
  });
});
