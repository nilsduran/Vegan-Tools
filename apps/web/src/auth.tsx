import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createClient, type SupabaseClient, type User, type Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email?: string;
  name: string;
  avatarUrl?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error?: string }>;
  signInWithApple: () => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string; message?: string }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signUpWithPassword: (
    email: string,
    password: string,
    name?: string
  ) => Promise<{ error?: string; message?: string }>;
  signOut: () => Promise<void>;
  loginAsDemoUser: (name?: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

function userFromSupabaseUser(user: User): AuthUser {
  const metadata = user.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    metadata.user_name ||
    (user.email ? user.email.split("@")[0] : "Usuari");

  const avatarUrl = metadata.avatar_url || metadata.picture || undefined;

  return {
    id: user.id,
    email: user.email,
    name,
    avatarUrl,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize Supabase session or restore demo session from localStorage
  useEffect(() => {
    if (supabase) {
      void supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        if (currentSession?.user) {
          setSession(currentSession);
          setToken(currentSession.access_token);
          setUser(userFromSupabaseUser(currentSession.user));
        }
        setLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange(
        (_event, newSession) => {
          if (newSession?.user) {
            setSession(newSession);
            setToken(newSession.access_token);
            setUser(userFromSupabaseUser(newSession.user));
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
      // Local/offline demo user fallback
      const stored = localStorage.getItem("vegan_tools_demo_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { user: AuthUser; token: string };
          setUser(parsed.user);
          setToken(parsed.token);
        } catch {
          // Ignore
        }
      }
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async (): Promise<{ error?: string }> => {
    if (!supabase) {
      loginAsDemoUser("Usuari Google");
      return {};
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
      loginAsDemoUser("Usuari Apple");
      return {};
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
    email: string
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase) {
      loginAsDemoUser(email.split("@")[0]);
      return { message: "Sessió iniciada en mode desenvolupament." };
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: window.location.href,
      },
    });
    if (error) return { error: error.message };
    return { message: "Hem enviat un enllaç d'accés al teu correu electrònic." };
  };

  const signInWithPassword = async (
    email: string,
    password: string
  ): Promise<{ error?: string }> => {
    if (!supabase) {
      loginAsDemoUser(email.split("@")[0]);
      return {};
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return error ? { error: error.message } : {};
  };

  const signUpWithPassword = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error?: string; message?: string }> => {
    if (!supabase) {
      loginAsDemoUser(name || email.split("@")[0]);
      return { message: "Compte creat correctament." };
    }
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: name?.trim(),
        },
      },
    });
    if (error) return { error: error.message };
    if (!data.session) {
      return { message: "Revisa el teu correu electrònic per confirmar el teu compte." };
    }
    return {};
  };

  const signOut = async (): Promise<void> => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem("vegan_tools_demo_user");
    setUser(null);
    setSession(null);
    setToken(null);
  };

  const loginAsDemoUser = (name = "Col·laborador/a") => {
    const demoId = `user-demo-${crypto.randomUUID()}`;
    const demoUser: AuthUser = {
      id: demoId,
      name,
      email: "demo@vegan-tools.app",
    };
    // Create a client fake JWT token
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        sub: demoId,
        email: "demo@vegan-tools.app",
        user_metadata: { full_name: name },
      })
    );
    const demoToken = `${header}.${payload}.demo_sig`;

    localStorage.setItem(
      "vegan_tools_demo_user",
      JSON.stringify({ user: demoUser, token: demoToken })
    );
    setUser(demoUser);
    setToken(demoToken);
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
        signOut,
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
  signOut: async () => {},
  loginAsDemoUser: () => {},
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  return context || defaultAuthValue;
}
