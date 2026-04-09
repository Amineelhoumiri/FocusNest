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
import { YouTubePlaybackProvider } from "@/context/YouTubePlaybackContext";
import { ZenModeProvider } from "@/context/ZenModeContext";
import AppLayout from "@/components/layout/AppLayout";

const renderAppLayout = () => {
  return render(
    <ThemeProvider>
      <ZenModeProvider>
        <FocusScoreProvider>
          <SpotifyPlaybackProvider>
            <YouTubePlaybackProvider>
              <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                  <Route path="/login" element={<div>Login Page</div>} />
                  <Route path="/welcome/consent" element={<div>Welcome Consent</div>} />
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<div>Dashboard Content</div>} />
                  </Route>
                </Routes>
              </MemoryRouter>
            </YouTubePlaybackProvider>
          </SpotifyPlaybackProvider>
        </FocusScoreProvider>
      </ZenModeProvider>
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

  it("shows loading shell while session is resolving", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: null,
      isLoading: true,
    });

    renderAppLayout();
    expect(screen.getByRole("status")).toHaveTextContent("Loading");
  });

  it("redirects to welcome consent when core consent is not recorded", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        user_id: "abc",
        full_name: "Amine",
        email: "a@a.com",
        is_admin: false,
        is_consented_core: false,
      },
      isLoading: false,
    });

    renderAppLayout();
    expect(screen.getByText("Welcome Consent")).toBeTruthy();
    expect(screen.queryByText("Dashboard Content")).toBeNull();
  });

  it("renders children when user is authenticated", () => {
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      user: {
        user_id: "abc",
        full_name: "Amine",
        email: "a@a.com",
        is_admin: false,
        is_consented_core: true,
      },
      isLoading: false,
    });

    renderAppLayout();
    expect(screen.getByText("Dashboard Content")).toBeTruthy();
  });
});
