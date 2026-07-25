// Rastro de acesso cross-sistema: envia eventos "enter"/"exit" para a edge
// function pública `track-activity` do portal central (vpsistema), que
// alimenta uma timeline mostrando quando cada colaborador entra e sai de
// cada sistema satélite. Fire-and-forget por design — nunca deve travar nem
// quebrar a UI do Propostas se a chamada falhar (rede offline, endpoint fora
// do ar, env var ausente, etc.).
//
// Não usar para eventos de negócio (ex.: "proposta criada") — isso é coberto
// por outro mecanismo. Aqui só entram os dois eventos de sessão.
const TRACK_ACTIVITY_URL =
  "https://ubdkoqxfwcraftesgmbw.supabase.co/functions/v1/track-activity";
const APP_KEY = "propostas";
const SESSION_STORAGE_KEY = "vp_track_activity_session_id";

type TrackEventType = "enter" | "exit";

interface TrackActivityPayload {
  app: string;
  event_type: TrackEventType;
  user_email: string;
  user_name: string;
  session_id: string;
  track_key: string;
}

function getTrackKey(): string {
  try {
    return (import.meta.env as Record<string, string | undefined>)
      .VITE_TRACK_ACTIVITY_KEY || "";
  } catch {
    return "";
  }
}

function getOrCreateSessionId(): string | null {
  if (typeof window === "undefined" || typeof sessionStorage === "undefined") {
    return null;
  }
  try {
    const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    return id;
  } catch {
    // sessionStorage indisponível (modo privado, etc.) — sem rastreio nesta aba.
    return null;
  }
}

function buildPayload(
  eventType: TrackEventType,
  userEmail: string,
  userName: string,
  sessionId: string,
): TrackActivityPayload {
  return {
    app: APP_KEY,
    event_type: eventType,
    user_email: userEmail,
    user_name: userName,
    session_id: sessionId,
    track_key: getTrackKey(),
  };
}

// Chamar uma única vez, assim que a identidade do usuário (e-mail) estiver
// disponível — não em loop, não a cada render.
export function trackEnter(userEmail: string, userName: string): void {
  try {
    const key = getTrackKey();
    const sessionId = getOrCreateSessionId();
    if (!key || !userEmail || !sessionId) return;

    const payload = buildPayload("enter", userEmail, userName, sessionId);
    // Fire-and-forget: não bloqueia o render, erro de rede é ignorado.
    fetch(TRACK_ACTIVITY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // silencioso — não deve afetar a UI
    });
  } catch {
    // silencioso
  }
}

// Chamado no pagehide da aba. Usa sendBeacon (em vez de fetch) porque
// precisa completar mesmo com a página sendo descartada; sendBeacon não
// aceita headers customizados, por isso o track_key vai no corpo do POST.
export function trackExit(userEmail: string, userName: string): void {
  try {
    const key = getTrackKey();
    const sessionId = getOrCreateSessionId();
    if (!key || !userEmail || !sessionId) return;

    const payload = buildPayload("exit", userEmail, userName, sessionId);
    const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
    const sent = navigator.sendBeacon?.(TRACK_ACTIVITY_URL, blob);
    if (!sent) {
      // Fallback para navegadores sem sendBeacon (raro) — best effort.
      fetch(TRACK_ACTIVITY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // silencioso
  }
}
