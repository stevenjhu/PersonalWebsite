import {
  app,
  type HttpRequest,
  type HttpResponseInit,
  type InvocationContext,
} from "@azure/functions";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown; // honeypot
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Very small in-memory rate limiter (best-effort; resets on cold start).
// Keyed by client IP: max 5 submissions per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

function json(status: number, body: Record<string, unknown>): HttpResponseInit {
  return { status, jsonBody: body };
}

export async function contact(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const expectedSecret = process.env.INTERNAL_SECRET;
  const secret = request.headers.get("x-internal-secret");
  if (!expectedSecret || secret !== expectedSecret) {
    return json(403, { error: "Forbidden." });
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  // Honeypot: silently accept (pretend success) so bots don't learn.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return json(200, { ok: true });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!name || !email || !message) {
    return json(400, { error: "All fields are required." });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return json(400, { error: "Please provide a valid email address." });
  }
  if (message.length > 5000 || name.length > 200) {
    return json(400, { error: "Input too long." });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return json(429, { error: "Too many requests. Please try again later." });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  const from = process.env.CONTACT_FROM; // e.g. "Portfolio <contact@shiqihu.com>"

  if (!apiKey || !to || !from) {
    context.error("Contact form is missing email configuration.");
    return json(500, { error: "Email service is not configured." });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        reply_to: email,
        subject: `Portfolio contact from ${name}`,
        text: `From: ${name} <${email}>\n\n${message}`,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      context.error(`Resend error ${res.status}: ${detail}`);
      if (res.status === 429) {
        return json(503, { error: "EMAIL_CAP_REACHED" });
      }
      return json(502, { error: "Failed to send message. Please try again." });
    }
  } catch (err) {
    context.error("Unexpected error sending email", err);
    return json(500, { error: "Failed to send message. Please try again." });
  }

  return json(200, { ok: true });
}

app.http("contact", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "contact",
  handler: contact,
});
