import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

// Mock auth context
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FocusScoreProvider } from "@/context/FocusScoreContext";
import { SpotifyPlaybackProvider } from "@/context/SpotifyPlaybackContext";
import AppLayout from "@/components/layout/AppLayout";

const renderAppLayout = () => {
  return render(
    <ThemeProvider>
      <FocusScoreProvider>
        <SpotifyPlaybackProvider>
          <MemoryRouter initialEntries={["/dashboard"]}>
            <Routes>
              <Route path="/login" element={<div>Login Page</div>} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<div>Dashboard Content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </SpotifyPlaybackProvider>
      </FocusScoreProvider>
    </ThemeProvider>
  );
};

describe("AppLayout auth guard", () => {
  it("redirects to /login when user is null and not loading", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderAppLayout();
    expect(screen.getByText("Login Page")).toBeTruthy();
    expect(screen.queryByText("Dashboard Content")).toBeNull();
  });

  it("renders nothing (null) while loading", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { container } = renderAppLayout();
    expect(container.firstChild).toBeNull();
  });

  it("renders children when user is authenticated", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: { user_id: "abc", full_name: "Amine", email: "a@a.com", is_admin: false },
      isLoading: false,
    });

    renderAppLayout();
    expect(screen.getByText("Dashboard Content")).toBeTruthy();
  });
});
