import { createContext, useContext, useEffect, useState, useCallback } from "react";

const CENTRAL_URL  = "https://ubdkoqxfwcraftesgmbw.supabase.co";
const CENTRAL_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGtvcXhmd2NyYWZ0ZXNnbWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjUwMjcsImV4cCI6MjA5MDY0MTAyN30.s1A15nFQVne94gbz0511L2IYvHdTcgYeL0H8YU80iI8";
const SESSION_KEY  = "propostas_user";

export interface SessionUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: SessionUser | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const handleSSOToken = useCallback(async (ssoToken: string) => {
    try {
      const resp = await fetch(`${CENTRAL_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${ssoToken}`, apikey: CENTRAL_ANON },
      });
      if (!resp.ok) throw new Error('Token Central inválido');
      const centralUser = await resp.json();
      if (!centralUser?.email) throw new Error('Email não encontrado');

      const sessionUser: SessionUser = { id: centralUser.id, email: centralUser.email };
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      setUser(sessionUser);
    } catch (e) {
      console.error('[SSO] Erro:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get('sso_token');

    if (ssoToken) {
      window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
      handleSSOToken(ssoToken);
      return;
    }

    // Sessão local existente
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (_) {}
    setLoading(false);
  }, [handleSSOToken]);

  const signOut = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    window.location.replace("https://vpsistema.com");
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
