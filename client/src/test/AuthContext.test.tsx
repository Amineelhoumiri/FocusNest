import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Mock better-auth client
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    useSession: vi.fn(),
    signIn: {
      email: vi.fn(),
    },
    signUp: {
      email: vi.fn(),
    },
    signOut: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { authClient } from "@/lib/auth-client";

const TestConsumer = ({ onRender }: { onRender: (auth: ReturnType<typeof useAuth>) => void }) => {
  const auth = useAuth();
  onRender(auth);
  return null;
};

const renderWithAuth = (onRender: (auth: ReturnType<typeof useAuth>) => void) => {
  return render(
    <AuthProvider>
      <TestConsumer onRender={onRender} />
    </AuthProvider>
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with user null and isLoading true while session is pending", () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isPending: true,
    });

    let captured: ReturnType<typeof useAuth> | null = null;
    renderWithAuth((auth) => { captured = auth; });

    expect(captured!.user).toBeNull();
    expect(captured!.isLoading).toBe(true);
  });

  it("fetches profile when session exists and sets user", async () => {
    const fakeSession = { user: { id: "abc", email: "test@test.com" } };
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: fakeSession,
      isPending: false,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user_id: "abc",
        full_name: "Test User",
        email: "test@test.com",
        is_admin: false,
      }),
    });

    let captured: ReturnType<typeof useAuth> | null = null;
    renderWithAuth((auth) => { captured = auth; });

    await waitFor(() => {
      expect(captured!.user).not.toBeNull();
    });

    expect(captured!.user?.full_name).toBe("Test User");
    expect(captured!.user?.email).toBe("test@test.com");
  });

  it("keeps isLoading true when session exists but profile not yet loaded (race condition guard)", async () => {
    const fakeSession = { user: { id: "abc", email: "test@test.com" } };
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: fakeSession,
      isPending: false,
    });

    // Delay the profile fetch so we can catch the loading state
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves

    let captured: ReturnType<typeof useAuth> | null = null;
    renderWithAuth((auth) => { captured = auth; });

    // Even though sessionLoading=false and profileLoading=false initially,
    // session.user exists and user=null → isLoading must stay true
    expect(captured!.isLoading).toBe(true);
  });

  it("clears user when session is null and not loading", async () => {
    (authClient.useSession as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isPending: false,
    });

    let captured: ReturnType<typeof useAuth> | null = null;
    renderWithAuth((auth) => { captured = auth; });

    await waitFor(() => {
      expect(captured!.isLoading).toBe(false);
    });

    expect(captured!.user).toBeNull();
  });
});
