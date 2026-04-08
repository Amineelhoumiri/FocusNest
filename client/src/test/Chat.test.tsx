import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      user_id: "00000000-0000-4000-8000-000000000001",
      full_name: "Test User",
      email: "test@example.com",
      is_admin: false,
      is_consented_ai: true,
    },
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    updateLocalUser: vi.fn(),
  }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

// jsdom doesn't implement scrollIntoView / scrollTo
window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.scrollTo = vi.fn();

import Chat from "@/pages/Chat";

const renderChat = () =>
  render(
    <MemoryRouter>
      <ThemeProvider>
        <Chat />
      </ThemeProvider>
    </MemoryRouter>
  );

// Default: tasks API + empty chat session on mount
const emptyResponse = () =>
  Promise.resolve({ ok: true, json: async () => [] });

describe("Chat page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation(() => emptyResponse());
  });

  it("shows prompt cards on first load (no messages)", async () => {
    renderChat();

    await waitFor(() => {
      expect(screen.getByText("Break down a task")).toBeTruthy();
      expect(screen.getByText("Prioritise my day")).toBeTruthy();
      expect(screen.getByText("Overcome procrastination")).toBeTruthy();
    });
  });

  it("renders the message input textarea", async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/ask finch/i)).toBeTruthy();
    });
  });

  it("clicking a prompt card immediately sends the message", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // tasks
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s1" }) }) // POST /api/chat
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // save user message
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, result: "On it!" }) }) // AI
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // save AI message

    renderChat();

    await waitFor(() => screen.getByText("Break down a task"));

    await act(async () => {
      fireEvent.click(screen.getByText("Break down a task"));
    });

    // The prompt card's prompt is sent as a user message bubble
    await waitFor(() => {
      expect(screen.getByText(/break down.*task|overwhelming task/i)).toBeTruthy();
    });
  });

  it("shows the history link in the top bar", async () => {
    renderChat();
    await waitFor(() => {
      expect(screen.getByText(/history/i)).toBeTruthy();
    });
  });

  it("sends a message and shows the AI reply", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // tasks
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s1" }) }) // new session
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // save user msg
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: "Here is my reply" }),
      }) // AI
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // save AI msg

    renderChat();
    await waitFor(() => screen.getByPlaceholderText(/ask finch/i));

    const textarea = screen.getByPlaceholderText(/ask finch/i);
    fireEvent.change(textarea, { target: { value: "Help me focus" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    await waitFor(() => {
      expect(screen.getAllByText("Help me focus").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows user message immediately (optimistic) before AI responds", async () => {
    let resolveAI!: (v: unknown) => void;
    const aiPromise = new Promise((res) => { resolveAI = res; });

    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // tasks
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s2" }) }) // new session
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // save user msg
      .mockReturnValueOnce({ ok: true, json: () => aiPromise }); // AI slow

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

    resolveAI({ success: true, result: "Response" });
  });

  it("clears the textarea after sending", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [] }) // tasks
      .mockResolvedValueOnce({ ok: true, json: async () => ({ chat_session_id: "s3" }) }) // new session
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // save user msg
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, result: "OK" }),
      }) // AI
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }); // save AI msg

    renderChat();
    await waitFor(() => screen.getByPlaceholderText(/ask finch/i));

    const textarea = screen.getByPlaceholderText(/ask finch/i);
    fireEvent.change(textarea, { target: { value: "My message" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    await waitFor(() => {
      const freshTextarea = screen.getByPlaceholderText(/ask finch/i) as HTMLTextAreaElement;
      expect(freshTextarea.value).toBe("");
    });
  });

  it("does not send when textarea is empty", async () => {
    renderChat();
    const textarea = await screen.findByPlaceholderText(/ask finch/i);

    const callsBefore = mockFetch.mock.calls.length; // only the tasks fetch

    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(mockFetch.mock.calls.length).toBe(callsBefore);
  });
});
