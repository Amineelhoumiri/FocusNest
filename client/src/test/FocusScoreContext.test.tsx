import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import { FocusScoreProvider, useFocusScore } from "@/context/FocusScoreContext";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const TestConsumer = ({ onRender }: { onRender: (ctx: ReturnType<typeof useFocusScore>) => void }) => {
  const ctx = useFocusScore();
  onRender(ctx);
  return null;
};

const renderWithProvider = (onRender: (ctx: ReturnType<typeof useFocusScore>) => void) =>
  render(<FocusScoreProvider><TestConsumer onRender={onRender} /></FocusScoreProvider>);

describe("FocusScoreContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with score 0 and streak 0", () => {
    mockFetch.mockResolvedValueOnce({ ok: false }); // refreshScore fails silently
    let captured: ReturnType<typeof useFocusScore> | null = null;
    renderWithProvider((ctx) => { captured = ctx; });
    expect(captured!.score).toBe(0);
    expect(captured!.streak).toBe(0);
  });

  it("loads score and streak from /api/users/me on mount", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ focus_score: 150, streak: 7 }),
    });

    let captured: ReturnType<typeof useFocusScore> | null = null;
    renderWithProvider((ctx) => { captured = ctx; });

    await waitFor(() => {
      expect(captured!.score).toBe(150);
      expect(captured!.streak).toBe(7);
    });
  });

  it("addScore optimistically increments score before API responds", async () => {
    // Initial load
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ focus_score: 100, streak: 3 }),
    });

    let captured: ReturnType<typeof useFocusScore> | null = null;
    renderWithProvider((ctx) => { captured = ctx; });

    await waitFor(() => expect(captured!.score).toBe(100));

    // addScore call — API responds with confirmed value
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ focus_score: 110 }),
    });

    await act(async () => {
      captured!.addScore(10);
    });

    // Optimistic update fires immediately
    expect(captured!.score).toBe(110);
  });

  it("keeps optimistic score if API call fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ focus_score: 50, streak: 0 }),
    });

    let captured: ReturnType<typeof useFocusScore> | null = null;
    renderWithProvider((ctx) => { captured = ctx; });

    await waitFor(() => expect(captured!.score).toBe(50));

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      captured!.addScore(5);
    });

    // Optimistic update stays
    expect(captured!.score).toBe(55);
  });

  it("useFocusScore throws when used outside provider", () => {
    const BadConsumer = () => {
      useFocusScore();
      return null;
    };
    expect(() => render(<BadConsumer />)).toThrow("useFocusScore must be used within FocusScoreProvider");
  });
});
