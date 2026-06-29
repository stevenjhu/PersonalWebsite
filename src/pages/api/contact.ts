import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

interface ContactPayload {
  name?: unknown;
  email?: unknown;
  message?: unknown;
  company?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Best-effort in-memory rate limiter (resets on cold start, per isolate).
// Keyed by IP: max 5 submissions per 10 minutes.
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

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot: silently accept so bots don't learn.
  if (typeof payload.company === "string" && payload.company.trim() !== "") {
    return Response.json({ ok: true });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";

  if (!name || !email || !message) {
    return Response.json({ error: "All fields are required." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return Response.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }
  if (message.length > 5000 || name.length > 200) {
    return Response.json({ error: "Input too long." }, { status: 400 });
  }

  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const apiKey = env.RESEND_API_KEY;
  const to = env.CONTACT_TO;
  const from = env.CONTACT_FROM;

  if (!apiKey || !to || !from) {
    return Response.json(
      { error: "Email service is not configured." },
      { status: 500 },
    );
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
      if (res.status === 429) {
        return Response.json({ error: "EMAIL_CAP_REACHED" }, { status: 503 });
      }
      return Response.json(
        { error: "Failed to send message. Please try again." },
        { status: 502 },
      );
    }
  } catch {
    return Response.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true });
};
