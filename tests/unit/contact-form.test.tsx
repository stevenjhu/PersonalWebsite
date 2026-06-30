// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ContactForm from "../../src/components/ContactForm";

describe("ContactForm", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setup() {
    const user = userEvent.setup();
    render(<ContactForm />);
    return {
      user,
      name: () => screen.getByLabelText(/^name$/i),
      email: () => screen.getByLabelText(/^email$/i),
      message: () => screen.getByLabelText(/^message$/i),
      submit: () => screen.getByRole("button", { name: /send message/i }),
    };
  }

  // ── Section 1: Client-side validation ─────────────────────────────────────

  describe("1 – client-side validation", () => {
    it("1.1 shows error and fires no fetch when all fields are empty", async () => {
      const { user, submit } = setup();
      await user.click(submit());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please fill in all fields.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.2 shows error and fires no fetch when only name is filled", async () => {
      const { user, name, submit } = setup();
      await user.type(name(), "Test");
      await user.click(submit());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please fill in all fields.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.3 shows error when name + email filled but message is empty", async () => {
      const { user, name, email, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "test@example.com");
      await user.click(submit());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please fill in all fields.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.4 shows email error for 'notanemail'", async () => {
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "notanemail");
      await user.type(message(), "Hello");
      await user.click(submit());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid email address.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.5 shows email error for 'a@b' (no TLD)", async () => {
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "a@b");
      await user.type(message(), "Hello");
      await user.click(submit());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Please enter a valid email address.",
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.6 passes validation for 'user@domain.com' and fires fetch", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "user@domain.com");
      await user.type(message(), "Hello");
      await user.click(submit());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    });

    it("1.7 button shows 'Sending…' and is disabled while request is in-flight", async () => {
      // Never-resolving fetch so we can observe the submitting state.
      mockFetch.mockImplementation(() => new Promise(() => {}));
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "test@example.com");
      await user.type(message(), "Hello");
      await user.click(submit());
      const btn = screen.getByRole("button");
      expect(btn).toHaveTextContent("Sending…");
      expect(btn).toBeDisabled();
    });
  });

  // ── Section 2: Honeypot ───────────────────────────────────────────────────

  describe("2 – honeypot", () => {
    it("2.1 submits normally when company field is empty", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "test@example.com");
      await user.type(message(), "Hello");
      await user.click(submit());
      await waitFor(() => expect(mockFetch).toHaveBeenCalledOnce());
    });

    it("2.2 shows success without calling fetch when honeypot is filled", async () => {
      const { user, name, email, message, submit } = setup();
      await user.type(name(), "Test");
      await user.type(email(), "test@example.com");
      await user.type(message(), "Hello");

      const honeypot = document.querySelector(
        'input[name="company"]',
      ) as HTMLInputElement;
      await user.type(honeypot, "Acme Corp");
      await user.click(submit());

      await waitFor(() =>
        expect(screen.getByRole("status")).toBeInTheDocument(),
      );
      expect(screen.getByText(/thanks/i)).toBeInTheDocument();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── Section 8: UI State Machine ───────────────────────────────────────────

  describe("8 – UI state machine", () => {
    async function submitValidForm(
      page: ReturnType<typeof setup>,
    ) {
      const { user, name, email, message, submit } = page;
      await user.type(name(), "Test");
      await user.type(email(), "test@example.com");
      await user.type(message(), "Hello");
      await user.click(submit());
    }

    it("8.2 shows success card after successful submission", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
      const page = setup();
      await submitValidForm(page);
      await waitFor(() =>
        expect(screen.getByRole("status")).toBeInTheDocument(),
      );
      expect(screen.getByText(/thanks/i)).toBeInTheDocument();
    });

    it("8.3 shows error message and keeps form editable on API error", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
        }),
      );
      const page = setup();
      await submitValidForm(page);
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Server error"),
      );
      // Form should still be interactive.
      expect(
        screen.getByRole("button", { name: /send message/i }),
      ).not.toBeDisabled();
    });

    it("8.4 shows cap card with direct email link on EMAIL_CAP_REACHED", async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ error: "EMAIL_CAP_REACHED" }), {
          status: 503,
        }),
      );
      const page = setup();
      await submitValidForm(page);
      await waitFor(() =>
        expect(screen.getByRole("status")).toBeInTheDocument(),
      );
      expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        expect.stringContaining("mailto:"),
      );
    });

    it("8.5 shows error message on network failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network offline"));
      const page = setup();
      await submitValidForm(page);
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent("Network offline"),
      );
    });
  });
});
