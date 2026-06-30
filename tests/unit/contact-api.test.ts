import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { env } from "cloudflare:workers";
import { POST } from "../../src/pages/api/contact";

// Shared mutable env object — mutations here are visible inside the handler.
const mockEnv = env as unknown as Record<string, string | undefined>;

const AZURE_URL = "https://contact.example.azurewebsites.net/api/contact";
const SECRET = "test-internal-secret";

function makeRequest(body: unknown): Parameters<typeof POST>[0] {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return {
    request: new Request("http://localhost/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr,
    }),
  } as Parameters<typeof POST>[0];
}

// The handler is a thin proxy: it forwards the request to the Azure Function
// (validation, rate limiting, and Resend delivery all live there) and passes
// Azure's status and body straight back. These tests cover the proxy contract.
describe("POST /api/contact (Azure proxy)", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    Object.keys(mockEnv).forEach((k) => delete mockEnv[k]);
    Object.assign(mockEnv, {
      AZURE_CONTACT_URL: AZURE_URL,
      CONTACT_FORM_SECRET: SECRET,
    });

    mockFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("forwards to AZURE_CONTACT_URL with POST and the internal secret header", async () => {
    await POST(
      makeRequest({ name: "Alice", email: "alice@example.com", message: "Hello" }),
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe(AZURE_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-Internal-Secret": SECRET,
    });
  });

  it("passes the request body through unchanged", async () => {
    const payload = { name: "Alice", email: "alice@example.com", message: "Hello" };
    await POST(makeRequest(payload));

    const [, init] = mockFetch.mock.calls[0];
    const forwarded = await new Response(init.body).text();
    expect(forwarded).toBe(JSON.stringify(payload));
  });

  it("passes through Azure's 200 status and body", async () => {
    const res = await POST(
      makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("passes through an Azure 400 validation error", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "All fields are required." }), {
        status: 400,
      }),
    );
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "All fields are required." });
  });

  it("passes through the rate-limit 429 from Azure", async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429 },
      ),
    );
    const res = await POST(
      makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Too many requests. Please try again later.",
    });
  });

  it("passes through the EMAIL_CAP_REACHED 503 from Azure", async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ error: "EMAIL_CAP_REACHED" }), {
        status: 503,
      }),
    );
    const res = await POST(
      makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
    );
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "EMAIL_CAP_REACHED" });
  });

  it("always sets Content-Type application/json on the response", async () => {
    mockFetch.mockResolvedValue(new Response("upstream failure", { status: 502 }));
    const res = await POST(
      makeRequest({ name: "Test", email: "a@b.com", message: "hi" }),
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });
});
