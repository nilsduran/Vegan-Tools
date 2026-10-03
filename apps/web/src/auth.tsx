import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient, type SupabaseClient, type User, type Session } from "@supabase/supabase-js";
import { normalizeUsername, validateUsername } from "@vegan-tools/domain";
import { generateSafeUUID } from "./utils/uuid";
import { tx } from "./i18n";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  usernameChanges?: number[];
}

export { normalizeUsername, validateUsername };

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: (chosenUsername?: string) => Promise<{ error?: string }>;
  signInWithApple: (chosenUsername?: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string, chosenUsername?: string) => Promise<{ error?: string; message?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    username: string
  ) => Promise<{ error?: string; message?: string }>;
  requestPasswordReset?: (email: string) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  updateUsername: (newUsername: string) => Promise<{ error?: string }>;
  loginWithUsername: (username: string) => void;
  loginAsDemoUser: (name?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)
)?.trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function userFromSupabaseUser(user: User, fallbackUsername?: string): AuthUser {
  const metadata = user.user_metadata || {};
  const cleanUser =
    normalizeUsername(metadata.username || metadata.user_name || fallbackUsername || "") ||
    normalizeUsername(user.email ? user.email.split("@")[0]! : "") ||
    `vegi_${user.id.slice(0, 5)}`;

  const name = metadata.full_name?.replace(/^@+/, "") || cleanUser;
  const avatarUrl = metadata.avatar_url || metadata.picture || undefined;

  return {
    id: user.id,
    username: cleanUser,
    email: user.email,
    name,
    avatarUrl,
  };
}

interface LocalUserRecord {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  usernameChanges: number[];
}

const USERS_STORAGE_KEY = "vegan_tools_users_store";
const SESSION_STORAGE_KEY = "vegan_tools_auth_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getStoredUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalUserRecord[]) : [];
  } catch {
    return [];
  }
}

function saveStoredUsers(users: LocalUserRecord[]) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

async function hashPassword(password: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`vtools_salt_${password}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  return btoa(password);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase session or restore persistent user session from localStorage
  useEffect(() => {
    if (supabase) {
      void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setToken(currentSession.access_token);
          setUser(userFromSupabaseUser(currentSession.user));
        } else {
          const stored = localStorage.getItem(SESSION_STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as { user: AuthUser; token: string };
              if (parsed.user && parsed.user.username) {
                setUser(parsed.user);
                setToken(parsed.token || "authenticated_token");
              }
            } catch {
              // Ignore invalid JSON
            }
          }
        }
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (newSession?.user) {
            setSession(newSession);
            setToken(newSession.access_token);
            const authUser = userFromSupabaseUser(newSession.user);
            setUser(authUser);
            const isBrandNew = Math.abs(Date.now() - new Date(newSession.user.created_at).getTime()) < 20000;
            if (!isBrandNew) {
              localStorage.setItem(`vegan_tools_onboarding_done_${authUser.id}`, "true");
              localStorage.removeItem(`vegan_tools_new_signup_${authUser.id}`);
            }
          } else {
            setSession(null);
            setToken(null);
            setUser(null);
          }
          setLoading(false);
        }
      );

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      // Local persistent session restore
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { user: AuthUser; token: string };
          if (parsed.user && parsed.user.username) {
            setUser(parsed.user);
            setToken(parsed.token || "authenticated_token");
          }
        } catch {
          // Ignore invalid JSON
        }
      }
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: tx("Social login is unavailable without Supabase credentials.") };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.href,
      },
    });
    return error ? { error: error.message } : {};
  };

  const signInWithApple = async (): Promise<{ error?: string }> => {
    if (!supabase) {
      return { error: tx("Social login is unavailable without Supabase credentials.") };
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: window.location.href,
      },
    });
    return error ? { error: error.message } : {};
  };

  const signInWithMagicLink = async (
    email: string,
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase) {
      return requestPasswordReset(email);
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.href,
      },
    });
    if (error) return { error: error.message };
    return { message: tx("We sent an access link to your email.") };
  };

  const signInWithPassword = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { error: tx("Invalid email or password.") };
    }

    if (!supabase) {
      const users = getStoredUsers();
      const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!existing) {
        return { error: tx("Invalid email or password.") };
      }

      const inputHash = await hashPassword(password);
      if (existing.passwordHash !== inputHash) {
        return { error: tx("Invalid email or password.") };
      }

      const authenticatedUser: AuthUser = {
        id: existing.id,
        email: existing.email,
        username: existing.username,
        name: existing.username,
        usernameChanges: existing.usernameChanges,
      };

      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: existing.id,
          email: existing.email,
          user_metadata: { full_name: existing.username, username: existing.username },
        })
      );
      const generatedToken = `${header}.${payload}.sig`;

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ user: authenticatedUser, token: generatedToken })
      );
      localStorage.setItem(`vegan_tools_onboarding_done_${authenticatedUser.id}`, "true");
      localStorage.removeItem(`vegan_tools_new_signup_${authenticatedUser.id}`);
      setUser(authenticatedUser);
      setToken(generatedToken);
      return {};
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) return { error: error.message };
    if (data.user) {
      const authUser = userFromSupabaseUser(data.user);
      localStorage.setItem(`vegan_tools_onboarding_done_${authUser.id}`, "true");
      localStorage.removeItem(`vegan_tools_new_signup_${authUser.id}`);
      setUser(authUser);
      setSession(data.session);
      setToken(data.session?.access_token || null);
    }
    return {};
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    username: string
  ): Promise<{ error?: string; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || !username.trim()) {
      return { error: tx("Please fill in all fields.") };
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return { error: validation.error || tx("Invalid username.") };
    }

    const cleanUser = normalizeUsername(username);

    if (!supabase) {
      const users = getStoredUsers();
      if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { error: tx("An account with this email already exists.") };
      }
      if (users.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
        return { error: tx("This username is already taken.") };
      }

      const inputHash = await hashPassword(password);
      const newUser: LocalUserRecord = {
        id: `user-${generateSafeUUID()}`,
        email: cleanEmail,
        username: cleanUser,
        passwordHash: inputHash,
        createdAt: new Date().toISOString(),
        usernameChanges: [],
      };

      users.push(newUser);
      saveStoredUsers(users);

      const authenticatedUser: AuthUser = {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        name: newUser.username,
        usernameChanges: [],
      };

      const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
      const payload = btoa(
        JSON.stringify({
          sub: newUser.id,
          email: newUser.email,
          user_metadata: { full_name: newUser.username, username: newUser.username },
        })
      );
      const generatedToken = `${header}.${payload}.sig`;

      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ user: authenticatedUser, token: generatedToken })
      );
      localStorage.setItem(`vegan_tools_new_signup_${newUser.id}`, "true");
      setUser(authenticatedUser);
      setToken(generatedToken);

      return { message: tx("Account created successfully!") };
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUser,
          full_name: cleanUser,
        },
      },
    });

    if (error) return { error: error.message };
    if (data.user) {
      localStorage.setItem(`vegan_tools_new_signup_${data.user.id}`, "true");
    }
    if (!data.session) {
      return { message: tx("We sent an access link to your email.") };
    }
    return {};
  };

  const requestPasswordReset = async (
    email: string
  ): Promise<{ error?: string; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      return { error: tx("Invalid email format.") };
    }

    if (supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.href,
      });
      if (error) return { error: error.message };
      return {
        message: tx("If the account exists, we have sent instructions to reset your password."),
      };
    }

    // Local mode: acknowledge without leaking account existence
    return {
      message: tx("If the account exists, we have sent instructions to reset your password."),
    };
  };

  const updateUsername = async (newUsername: string): Promise<{ error?: string }> => {
    if (!user) return { error: "Not logged in" };

    const validation = validateUsername(newUsername);
    if (!validation.valid) {
      return { error: tx(validation.error || "Username must be at least 3 characters.") };
    }
    const cleanUser = normalizeUsername(newUsername);

    if (user.username.toLowerCase() === cleanUser.toLowerCase()) {
      return {};
    }

    // Check rate limit: max 2 changes per 30 days
    const now = Date.now();
    const cutoff = now - THIRTY_DAYS_MS;
    const pastChanges = (user.usernameChanges || []).filter((ts) => ts > cutoff);

    if (pastChanges.length >= 2) {
      return { error: tx("Rate limit exceeded: maximum 2 username changes per month.") };
    }

    if (!supabase) {
      const users = getStoredUsers();
      if (
        users.some(
          (u) => u.id !== user.id && u.username.toLowerCase() === cleanUser.toLowerCase()
        )
      ) {
        return { error: tx("Username is already taken.") };
      }

      const updatedHistory = [...pastChanges, now];
      const updatedUsers = users.map((u) =>
        u.id === user.id
          ? { ...u, username: cleanUser, usernameChanges: updatedHistory }
          : u
      );
      saveStoredUsers(updatedUsers);

      const updatedUser: AuthUser = {
        ...user,
        username: cleanUser,
        name: cleanUser,
        usernameChanges: updatedHistory,
      };

      const currentToken = token || "authenticated_token";
      localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify({ user: updatedUser, token: currentToken })
      );
      setUser(updatedUser);
      return {};
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        username: cleanUser,
        full_name: cleanUser,
      },
    });

    if (error) return { error: error.message };

    setUser((prev) =>
      prev
        ? {
            ...prev,
            username: cleanUser,
            name: cleanUser,
            usernameChanges: [...pastChanges, now],
          }
        : null
    );
    return {};
  };

  const signOut = async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem("vegan_tools_public_user");
    localStorage.removeItem("vegan_tools_public_username");
    localStorage.removeItem("vegan_tools_demo_user");
    setUser(null);
    setSession(null);
    setToken(null);
  };

  // Compatibility helpers & Local Dev Login
  const loginWithUsername = (chosenUsername: string) => {
    const clean = normalizeUsername(chosenUsername) || "nils";
    const userId = `user-dev-${generateSafeUUID()}`;
    const newUser: AuthUser = {
      id: userId,
      username: clean,
      name: clean,
      email: `${clean}@localhost.local`,
      usernameChanges: [],
    };
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: userId,
        email: newUser.email,
        user_metadata: { full_name: clean, username: clean },
      })
    );
    const devToken = `${header}.${payload}.sig`;
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ user: newUser, token: devToken })
    );
    localStorage.setItem(`vegan_tools_onboarding_done_${newUser.id}`, "true");
    localStorage.removeItem(`vegan_tools_new_signup_${newUser.id}`);
    setUser(newUser);
    setToken(devToken);
  };

  const loginAsDemoUser = (name = "usuari_comunitat") => {
    loginWithUsername(name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        loading,
        signInWithGoogle,
        signInWithApple,
        signInWithMagicLink,
        signInWithPassword,
        signUpWithPassword,
        requestPasswordReset,
        signOut,
        updateUsername,
        loginWithUsername,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthValue: AuthContextValue = {
  user: null,
  session: null,
  token: null,
  loading: false,
  signInWithGoogle: async () => ({}),
  signInWithApple: async () => ({}),
  signInWithMagicLink: async () => ({}),
  signInWithPassword: async () => ({}),
  signUpWithPassword: async () => ({}),
  requestPasswordReset: async () => ({}),
  signOut: async () => {},
  updateUsername: async () => ({}),
  loginWithUsername: () => {},
  loginAsDemoUser: () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context || defaultAuthValue;
}
