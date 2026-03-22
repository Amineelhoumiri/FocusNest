import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

const TestConsumer = ({ onRender }: { onRender: (ctx: ReturnType<typeof useTheme>) => void }) => {
  const ctx = useTheme();
  onRender(ctx);
  return (
    <button onClick={ctx.toggleTheme}>Toggle</button>
  );
};

const renderWithTheme = (onRender: (ctx: ReturnType<typeof useTheme>) => void) =>
  render(<ThemeProvider><TestConsumer onRender={onRender} /></ThemeProvider>);

describe("ThemeContext", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("defaults to dark theme when localStorage is empty", () => {
    let captured: ReturnType<typeof useTheme> | null = null;
    renderWithTheme((ctx) => { captured = ctx; });
    expect(captured!.theme).toBe("dark");
  });

  it("reads theme from localStorage on mount", () => {
    localStorage.setItem("focusnest-theme", "light");
    let captured: ReturnType<typeof useTheme> | null = null;
    renderWithTheme((ctx) => { captured = ctx; });
    expect(captured!.theme).toBe("light");
  });

  it("toggleTheme switches from dark to light", () => {
    let captured: ReturnType<typeof useTheme> | null = null;
    const { getByText } = renderWithTheme((ctx) => { captured = ctx; });

    expect(captured!.theme).toBe("dark");
    fireEvent.click(getByText("Toggle"));
    expect(captured!.theme).toBe("light");
  });

  it("toggleTheme switches back from light to dark", () => {
    localStorage.setItem("focusnest-theme", "light");
    let captured: ReturnType<typeof useTheme> | null = null;
    const { getByText } = renderWithTheme((ctx) => { captured = ctx; });

    fireEvent.click(getByText("Toggle"));
    expect(captured!.theme).toBe("dark");
  });

  it("persists theme to localStorage after toggle", () => {
    const { getByText } = renderWithTheme(() => {});
    fireEvent.click(getByText("Toggle"));
    expect(localStorage.getItem("focusnest-theme")).toBe("light");
  });

  it("applies dark class to documentElement when theme is dark", () => {
    renderWithTheme(() => {});
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when theme is light", () => {
    localStorage.setItem("focusnest-theme", "light");
    renderWithTheme(() => {});
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("useTheme throws when used outside provider", () => {
    const BadConsumer = () => { useTheme(); return null; };
    expect(() => render(<BadConsumer />)).toThrow("useTheme must be used within ThemeProvider");
  });
});
