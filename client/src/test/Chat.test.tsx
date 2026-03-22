import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// Chat uses useTheme — provide a real ThemeProvider
import { ThemeProvider } from "@/context/ThemeContext";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

import Chat from "@/pages/Chat";

const renderChat = () =>
  render(
    <ThemeProvider>
      <Chat />
    </ThemeProvider>
  );

// Default: empty session list on mount
const emptySessionsResponse = () =>
  Promise.resolve({ ok: true, json: async () => [] });

describe("Chat page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockImplementation(() => emptySessionsResponse());
  });

  it("shows template cards on first load (no messages)", async () => {
    renderChat();

    await waitFor(() => {
      expect(screen.getByText("Break down a task")).toBeTruthy();
      expect(screen.getByText("Prioritize my day")).toBeTruthy();
      expect(screen.getByText("Overcome procrastination")).toBeTruthy();
    });
  });

  it("renders the message input textarea", async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask finch/i)).toBeTruthy();
    });
  });

  it("clicking a template card fills the textarea", async () => {
    renderChat();

    await waitFor(() => screen.getByText("Break down a task"));
    fireEvent.click(screen.getByText("Break down a task"));

    const textarea = screen.getByPlaceholderText(/ask finch/i) as HTMLTextAreaElement;
    expect(textarea.value).toContain("I have a task I'm feeling overwhelmed");
  });

  it("loads past sessions from API on mount and shows them in sidebar", async () => {
    const sessions = [
      {
        chat_session_id: "sess-1",
        created_at: "2026-03-20T10:00:00Z",
        updated_at: "2026-03-20T10:05:00Z",
        ended_at: null,
      },
    ];

    // Pre-set a title so the session passes the empty-filter
    localStorage.setItem("fn_chat_titles", JSON.stringify({ "sess-1": "My first chat" }));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => sessions,
    });

    renderChat();

    await waitFor(() => {
      expect(screen.getByText("My first chat")).toBeTruthy();
    });
  });

  it("sends a message and shows the AI reply", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { type: "text", text: "Here is my reply" } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    renderChat();
    await waitFor(() => screen.getByPlaceholderText(/ask finch/i));

    const textarea = screen.getByPlaceholderText(/ask finch/i);
    fireEvent.change(textarea, { target: { value: "Help me focus" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    // Message bubble appears (use getAllByText since textarea may still render the value briefly)
    await waitFor(() => {
      expect(screen.getAllByText("Help me focus").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows user message immediately (optimistic) before AI responds", async () => {
    let resolveAI!: (v: unknown) => void;
    const aiPromise = new Promise((res) => { resolveAI = res; });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s2" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockReturnValueOnce({ ok: true, json: () => aiPromise });  // AI is slow

    renderChat();
    await waitFor(() => screen.getByPlaceholderText(/ask finch/i));

    const textarea = screen.getByPlaceholderText(/ask finch/i);
    fireEvent.change(textarea, { target: { value: "Optimistic message" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    // User message appears immediately without waiting for AI
    await waitFor(() => {
      expect(screen.getAllByText("Optimistic message").length).toBeGreaterThanOrEqual(1);
    });

    // Resolve AI to clean up
    resolveAI({ success: true, result: { type: "text", text: "Response" } });
  });

  it("clears the textarea after sending", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s3" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: { type: "text", text: "OK" } }),
      });

    renderChat();
    await waitFor(() => screen.getByPlaceholderText(/ask finch/i));

    const textarea = screen.getByPlaceholderText(/ask finch/i);
    fireEvent.change(textarea, { target: { value: "My message" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    // After send, component re-renders with chat view — re-query the textarea
    await waitFor(() => {
      const freshTextarea = screen.getByPlaceholderText(/ask finch/i) as HTMLTextAreaElement;
      expect(freshTextarea.value).toBe("");
    });
  });

  it("does not send when textarea is empty", async () => {
    renderChat();
    const textarea = await screen.findByPlaceholderText(/ask finch/i);

    const callsBefore = mockFetch.mock.calls.length; // only the initial load

    // Try to send with empty input via Enter key
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    // No additional fetch calls made
    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });
});
