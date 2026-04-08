import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mocks
vi.mock("@/context/AuthContext", () => ({
  useAuth: vi.fn(),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      social: vi.fn(),
    },
  },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useAuth } from "@/context/AuthContext";
import { authClient } from "@/lib/auth-client";
import Login from "@/pages/Login";

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
      login: vi.fn(),
    });
  });

  it("renders email and password inputs", () => {
    renderLogin();
    expect(screen.getByPlaceholderText("you@example.com")).toBeTruthy();
    expect(screen.getByPlaceholderText("••••••••")).toBeTruthy();
  });

  it("shows error when submitting empty form", async () => {
    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeTruthy();
    });
  });

  it("calls login with email and password on valid submit", async () => {
    const mockLogin = vi.fn().mockResolvedValueOnce(undefined);
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ login: mockLogin });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@test.com", "password123");
    });
  });

  it("shows error when login throws (bad credentials)", async () => {
    const mockLogin = vi.fn().mockRejectedValueOnce(new Error("Invalid"));
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ login: mockLogin });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "bad@test.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      // Login surfaces the thrown Error message (see handleSubmit catch)
      expect(screen.getByText(/^invalid$/i)).toBeTruthy();
    });
  });

  it("calls authClient.signIn.social with google on Google button click", async () => {
    (authClient.signIn.social as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

    renderLogin();
    fireEvent.click(screen.getByRole("button", { name: /google/i }));

    await waitFor(() => {
      expect(authClient.signIn.social).toHaveBeenCalledWith(
        expect.objectContaining({ provider: "google" })
      );
    });
  });
});
