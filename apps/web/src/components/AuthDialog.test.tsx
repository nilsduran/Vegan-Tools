// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { AuthDialog } from "./AuthDialog";
import { AuthProvider } from "../auth";
import { setLanguage } from "../i18n";
import * as authModule from "../auth";

describe("AuthDialog Component", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setLanguage("ca");
  });

  afterEach(() => {
    cleanup();
  });

  it("renders login form by default and allows switching to signup and reset", () => {
    const { container } = render(
      <AuthProvider>
        <AuthDialog isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    // Initial mode is Sign in (Entrar / Iniciar sessió)
    expect(screen.getAllByRole("button", { name: /Entrar|Iniciar sessió|Sign in/i })[0]).toBeDefined();
    expect(screen.getByLabelText(/Correu electrònic|Email/i)).toBeDefined();
    expect(screen.getByLabelText(/Contrasenya|Password/i)).toBeDefined();

    // Switch to Signup tab (Crear compte)
    const signupTabs = screen.getAllByRole("button", { name: /Crear compte|Create account/i });
    fireEvent.click(signupTabs[0]!);

    // Public username field should now be present
    expect(screen.getByLabelText(/Tria un nom d'usuari públic|Choose a public username/i)).toBeDefined();

    // Switch to Reset tab (Recuperar contrasenya)
    const resetTab = screen.getByRole("button", { name: /Recuperar contrasenya|Reset password/i });
    fireEvent.click(resetTab);

    // Password field should not be visible in reset mode
    expect(container.querySelector("#auth-password")).toBeNull();
    expect(screen.getByRole("button", { name: /Enviar enllaç de recuperació|Send reset instructions/i })).toBeDefined();
  });

  it("shows error when Google login is attempted without Supabase", async () => {
    vi.spyOn(authModule, "useAuth").mockReturnValue({
      user: null,
      session: null,
      token: null,
      loading: false,
      signInWithGoogle: vi.fn().mockResolvedValue({
        error: "Social login is unavailable without Supabase credentials.",
      }),
      signInWithApple: vi.fn().mockResolvedValue({}),
      signInWithMagicLink: vi.fn().mockResolvedValue({}),
      signInWithPassword: vi.fn().mockResolvedValue({}),
      signUpWithPassword: vi.fn().mockResolvedValue({}),
      signOut: vi.fn().mockResolvedValue(undefined),
      loginWithUsername: vi.fn(),
      updateUsername: vi.fn().mockResolvedValue({}),
      loginAsDemoUser: vi.fn(),
    });

    render(
      <AuthProvider>
        <AuthDialog isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const googleBtn = screen.getByRole("button", { name: /Continua amb Google|Continue with Google/i });
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/L'inici de sessió social no està disponible|Social login is unavailable/i)
      ).toBeDefined();
    });
  });

  it("displays validation error when submitting incomplete login form", async () => {
    const { container } = render(
      <AuthProvider>
        <AuthDialog isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    // Submit without typing password
    const emailInput = screen.getByLabelText(/Correu electrònic|Email/i);
    fireEvent.change(emailInput, { target: { value: "test@exemple.cat" } });

    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(
        screen.getByText(/Correu electrònic o contrasenya incorrectes|Invalid email or password/i)
      ).toBeDefined();
    });
  });
});
