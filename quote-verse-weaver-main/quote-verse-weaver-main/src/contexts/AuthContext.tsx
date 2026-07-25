import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEnter, trackExit } from "@/lib/trackActivity";

const CENTRAL_URL  = "https://ubdkoqxfwcraftesgmbw.supabase.co";
const CENTRAL_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViZGtvcXhmd2NyYWZ0ZXNnbWJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNjUwMjcsImV4cCI6MjA5MDY0MTAyN30.s1A15nFQVne94gbz0511L2IYvHdTcgYeL0H8YU80iI8";
const SESSION_KEY  = "propostas_user";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
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

  // --- Rastro de acesso cross-sistema (timeline central do vpsistema) ---
  // "enter" dispara uma única vez assim que o e-mail do usuário (validado
  // via SSO contra o portal central) fica disponível — nunca antes disso e
  // nunca em loop. "exit" dispara no pagehide da aba, reaproveitando o
  // mesmo session_id salvo em sessionStorage por trackActivity.ts.
  const hasTrackedEnterRef = useRef(false);
  const userRef = useRef<SessionUser | null>(null);
  userRef.current = user;

  const handleSSOToken = useCallback(async (ssoToken: string) => {
    try {
      const resp = await fetch(`${CENTRAL_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${ssoToken}`, apikey: CENTRAL_ANON },
      });
      if (!resp.ok) throw new Error('Token Central inválido');
      const centralUser = await resp.json();
      if (!centralUser?.email) throw new Error('Email não encontrado');

      // Nome vem do perfil local do Propostas (tabela `profiles`, sincronizada
      // por id com o usuário do vpsistema no momento da liberação de acesso
      // ao módulo) — o token central só garante id + email.
      let name = centralUser.email as string;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', centralUser.id)
          .single();
        if (profile?.full_name) name = profile.full_name;
      } catch (_) {
        // Sem perfil local ainda — segue com o e-mail como nome.
      }

      const sessionUser: SessionUser = { id: centralUser.id, email: centralUser.email, name };
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

  useEffect(() => {
    if (user?.email && !hasTrackedEnterRef.current) {
      hasTrackedEnterRef.current = true;
      trackEnter(user.email, user.name);
    }
  }, [user]);

  useEffect(() => {
    const onPageHide = () => {
      const u = userRef.current;
      if (u?.email) {
        trackExit(u.email, u.name);
      }
    };
    // pagehide (em vez de beforeunload) por causa do bfcache — dispara de
    // forma confiável tanto em navegação/fechamento quanto em bfcache.
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, []);

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
