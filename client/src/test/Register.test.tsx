import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { social: vi.fn() } },
}));
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useAuth } from "@/context/AuthContext";
import Register from "@/pages/Register";

const renderRegister = () =>
  render(<MemoryRouter><Register /></MemoryRouter>);

// Password must satisfy all 4 strength criteria: upper + lower + number + symbol + 8+ chars
const STRONG_PASS = "StrongPass1!";

const fillStep1 = (container: HTMLElement) => {
  fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Amine El Houmiri" } });
  // Date input has no placeholder — query by type
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2000-01-01" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "amine@test.com" } });
  fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: STRONG_PASS } });
  fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: STRONG_PASS } });
};

describe("Register page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ register: vi.fn() });
  });

  it("renders step 1 fields on mount", () => {
    renderRegister();
    expect(screen.getByPlaceholderText(/full name/i)).toBeTruthy();
    expect(screen.getByPlaceholderText(/email/i)).toBeTruthy();
  });

  it("shows error when submitting step 1 with empty fields", async () => {
    renderRegister();
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/fill in all fields/i)).toBeTruthy();
    });
  });

  it("shows error when passwords don't match", async () => {
    const { container } = renderRegister();
    fireEvent.change(screen.getByPlaceholderText("Full name"), { target: { value: "Amine" } });
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: "2000-01-01" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "amine@test.com" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: STRONG_PASS } });
    fireEvent.change(screen.getByPlaceholderText("Confirm password"), { target: { value: "Different1!" } });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Passwords don't match")).toBeTruthy();
    });
  });

  it("advances to step 2 (Privacy) on valid step 1", async () => {
    const { container } = renderRegister();
    fillStep1(container);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/privacy/i).length).toBeGreaterThan(0);
    });
  });

  it("calls register with correct data on final submit", async () => {
    const mockRegister = vi.fn().mockResolvedValueOnce(undefined);
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ register: mockRegister });

    const { container } = renderRegister();
    fillStep1(container);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => screen.getAllByText(/privacy/i));

    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Amine El Houmiri",
          email: "amine@test.com",
          password: STRONG_PASS,
        })
      );
    });
  });

  it("shows error when register throws", async () => {
    const mockRegister = vi.fn().mockRejectedValueOnce(new Error("Email already in use"));
    (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ register: mockRegister });

    const { container } = renderRegister();
    fillStep1(container);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => screen.getAllByText(/privacy/i));
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => {
      expect(screen.getByText(/email already in use/i)).toBeTruthy();
    });
  });

  it("back button returns to step 1 from step 2", async () => {
    const { container } = renderRegister();
    fillStep1(container);
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => screen.getAllByText(/privacy/i));

    // Back button is icon-only (ArrowLeft), first button in the footer row
    const buttons = screen.getAllByRole("button");
    const backButton = buttons.find(
      (btn) => btn.className.includes("w-\\[52px\\]") || (btn.querySelector("svg") && btn.textContent === "")
    ) ?? buttons[0];
    fireEvent.click(backButton);

    expect(screen.getByPlaceholderText(/full name/i)).toBeTruthy();
  });
});
