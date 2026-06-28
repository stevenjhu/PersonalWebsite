import { useState, type FormEvent } from "react";
import { Send, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { profile } from "../data/profile";

type Status = "idle" | "submitting" | "success" | "error" | "cap_reached";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // Honeypot: bots fill hidden fields; humans don't.
    if (data.get("company")) {
      setStatus("success");
      form.reset();
      return;
    }

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus("error");
      setError("Please fill in all fields.");
      return;
    }
    if (!EMAIL_RE.test(email)) {
      setStatus("error");
      setError("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (body?.error === "EMAIL_CAP_REACHED") {
          setStatus("cap_reached");
          return;
        }
        throw new Error(
          body?.error ?? "Something went wrong. Please try again.",
        );
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="border-border bg-surface flex flex-col items-center gap-3 rounded-xl border p-8 text-center"
      >
        <CheckCircle2 className="text-accent-strong" aria-hidden />
        <p className="font-medium">Thanks — your message is on its way.</p>
        <p className="text-muted text-sm">I'll get back to you soon.</p>
      </div>
    );
  }

  if (status === "cap_reached") {
    return (
      <div
        role="status"
        className="border-border bg-surface flex flex-col items-center gap-3 rounded-xl border p-8 text-center"
      >
        <Mail className="text-accent-strong" aria-hidden />
        <p className="font-medium">The contact form is temporarily unavailable.</p>
        <p className="text-muted text-sm">
          Please reach out to me directly at{" "}
          <a
            href={`mailto:${profile.email}`}
            className="text-accent-strong underline underline-offset-2"
          >
            {profile.email}
          </a>
          .
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-text placeholder:text-muted/70 focus:border-accent-strong focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {/* Honeypot field — visually hidden, ignored by humans. */}
      <div
        aria-hidden
        className="absolute left-[-9999px]"
        style={{ position: "absolute" }}
      >
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-muted font-mono text-sm">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-muted font-mono text-sm">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-muted font-mono text-sm">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          className={inputClass}
        />
      </div>

      {status === "error" && (
        <p
          role="alert"
          className="text-accent-strong flex items-center gap-2 text-sm"
        >
          <AlertCircle size={16} aria-hidden />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="bg-accent text-text inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <Send size={16} aria-hidden />
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
