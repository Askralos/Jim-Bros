import { useState, useEffect, useMemo, Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { styles } from "./lib/styles";
import { COLORS } from "./lib/constants";
import { getSession, onAuthStateChange } from "./lib/api/auth";
import { updateProfile } from "./lib/api/profiles";
import { createSession, editSession, deleteSession, writeEntry, deleteEntry, getSessionById } from "./lib/api/sessions";
import { createPreset, updatePreset, deletePreset } from "./lib/api/presets";
import { personalizeSession } from "./lib/utils";
import { loadDraft, clearDraft, newSessionDraftKey } from "./lib/drafts";
import { FavoritesProvider } from "./components/Favorites";
import { useAppData } from "./hooks/useAppData";
import { clearCache } from "./lib/cache";
import { lazyScreen } from "./lib/lazyScreen";

import { AuthScreen } from "./components/AuthScreen";
import { TopBar, BottomNav, NewSessionChooser } from "./components/Nav";
import { Home } from "./components/Home";
import { NewSession } from "./components/NewSession";
import { SessionModal } from "./components/SessionModal";

// Écrans secondaires chargés à la demande : le premier affichage (accueil, nouvelle
// séance) n'embarque que le nécessaire.
const ProfileScreen = lazyScreen(() => import("./components/ProfileScreen"), "ProfileScreen");
const ExercisesLibrary = lazyScreen(() => import("./components/ExercisesLibrary"), "ExercisesLibrary");
const CalendarView = lazyScreen(() => import("./components/CalendarView"), "CalendarView");
const Friends = lazyScreen(() => import("./components/Friends"), "Friends");

const LazyFallback = () => (
  <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
    <Dumbbell size={22} color={COLORS.muted} />
  </div>
);

export default function App() {
  const [booting, setBooting] = useState(true);
  const [authSession, setAuthSession] = useState(null);
  const [view, setView] = useState("home");
  const [modalSessionId, setModalSessionId] = useState(null);
  const [showNewSessionChooser, setShowNewSessionChooser] = useState(false);
  const [newSessionInitial, setNewSessionInitial] = useState(null);

  useEffect(() => {
    getSession().then((s) => {
      if (!s) clearCache(); // session expirée : le cache ne doit pas survivre à la déconnexion
      setAuthSession(s);
      setBooting(false);
    });
    const sub = onAuthStateChange((s) => setAuthSession(s));
    return () => sub.unsubscribe();
  }, []);

  const authUserId = authSession?.user?.id || null;
  const {
    cachedUserId, ready, loading,
    profiles, sessions: rawSessions, hasMoreSessions, loadMoreSessions, sessionShells, loadShells,
    exercises, presets, refreshSessions, refreshData,
  } = useAppData(authUserId);
  // Tant que la session se vérifie (parfois un aller-retour réseau), on affiche déjà
  // l'app avec les données en cache du dernier compte connecté sur cet appareil.
  const userId = authUserId || (booting ? cachedUserId : null);
  // Chaque séance vue avec mon titre/ma photo perso s'il y en a (voir personalizeSession).
  const sessions = useMemo(() => rawSessions.map((s) => personalizeSession(s, userId)), [rawSessions, userId]);

  // Tout l'historique allégé n'est chargé que pour les écrans qui s'en servent.
  useEffect(() => {
    if (authUserId && view === "friends") loadShells();
  }, [authUserId, view, loadShells]);

  const otherProfiles = useMemo(() => Object.values(profiles).filter((p) => p.id !== userId), [profiles, userId]);

  // La séance ouverte peut être hors de la fenêtre paginée (ex: ouverte depuis
  // l'historique complet d'un profil) : dans ce cas on va la chercher directement.
  const [fetchedModalSession, setFetchedModalSession] = useState(null);
  const modalSessionInWindow = modalSessionId ? sessions.find((s) => s.id === modalSessionId) : null;
  useEffect(() => {
    if (!modalSessionId || modalSessionInWindow) { setFetchedModalSession(null); return; }
    getSessionById(modalSessionId).then(setFetchedModalSession);
  }, [modalSessionId, modalSessionInWindow]);
  const modalSession = modalSessionInWindow || (fetchedModalSession?.id === modalSessionId ? personalizeSession(fetchedModalSession, userId) : null);

  // Séance en cours non publiée (brouillon) : reprise proposée depuis l'accueil et le "+".
  const hasDraft = !!userId && view !== "log" && !!loadDraft(newSessionDraftKey(userId));
  const startNewSession = (initial) => {
    if (hasDraft && !confirm("Remplacer ta séance en cours (pas encore publiée) ?")) return;
    clearDraft(newSessionDraftKey(userId));
    setNewSessionInitial(initial);
    setShowNewSessionChooser(false);
    setView("log");
  };

  const handleCreatePreset = async (name, exs) => { await createPreset(name, exs, userId); await refreshData("presets"); };
  const handleUpdatePreset = async (id, name, exs) => { await updatePreset(id, name, exs); await refreshData("presets"); };
  const handleDeletePreset = async (id) => { await deletePreset(id); await refreshData("presets"); };

  if (!userId) {
    if (!booting) return <AuthScreen />;
    return (
      <div style={styles.bootScreen}>
        <Dumbbell size={28} color={COLORS.lime} />
      </div>
    );
  }

  const profile = profiles[userId];
  if (!profile) {
    // Le trigger SQL crée le profil à l'inscription ; ce cas ne devrait durer
    // qu'une fraction de seconde le temps du premier chargement.
    return (
      <div style={styles.bootScreen}>
        <Dumbbell size={28} color={COLORS.lime} />
      </div>
    );
  }

  return (
    <FavoritesProvider userId={userId} profile={profile}>
    <div style={styles.app}>
      <TopBar profile={profile} />
      <div style={styles.content}>
        {loading && <div style={styles.loadingBar} />}

        {view === "home" && (
          <Home
            currentUserId={userId} profiles={profiles} sessions={sessions} ready={ready}
            onOpenSession={setModalSessionId}
            onNewSession={() => setShowNewSessionChooser(true)}
            hasDraft={hasDraft} onResumeDraft={() => setView("log")}
            onSeeCalendar={() => setView("calendar")}
          />
        )}

        {view === "calendar" && (
          <Suspense fallback={<LazyFallback />}>
            <CalendarView
              sessions={sessions} hasMoreSessions={hasMoreSessions} onLoadMoreSessions={loadMoreSessions}
              profiles={profiles} currentUserId={userId} onOpenSession={setModalSessionId} onBack={() => setView("home")}
            />
          </Suspense>
        )}

        {view === "log" && (
          <NewSession
            currentUserId={userId} otherProfiles={otherProfiles} exerciseList={exercises} sessions={sessions}
            draftKey={newSessionDraftKey(userId)} initial={newSessionInitial}
            onSubmit={async (payload, ownExercises) => {
              const newId = await createSession(payload, userId, ownExercises);
              clearDraft(newSessionDraftKey(userId)); // avant de quitter l'écran : l'accueil ne doit plus proposer de la reprendre
              await refreshSessions([newId]);
              setNewSessionInitial(null);
              setView("home");
            }}
            onCancel={() => { setNewSessionInitial(null); setView("home"); }}
          />
        )}

        {view === "profile" && (
          <Suspense fallback={<LazyFallback />}>
            <ProfileScreen
              currentUserId={userId} profile={profile}
              onSave={async (partial) => { await updateProfile(userId, partial); await refreshData("profiles"); }}
              onOpenSession={setModalSessionId}
              onRefresh={() => refreshData("profiles")}
            />
          </Suspense>
        )}

        {view === "friends" && (
          <Suspense fallback={<LazyFallback />}>
            <Friends currentUserId={userId} profiles={profiles} sessionShells={sessionShells} onOpenSession={setModalSessionId} />
          </Suspense>
        )}

        {view === "exercises" && (
          <Suspense fallback={<LazyFallback />}>
            <ExercisesLibrary
              exerciseList={exercises} currentUserId={userId} currentUsername={profile.username} profiles={profiles} onRefresh={() => refreshData("exercises")} presets={presets}
              onCreatePreset={handleCreatePreset}
              onUpdatePreset={handleUpdatePreset}
              onDeletePreset={handleDeletePreset}
            />
          </Suspense>
        )}

      </div>
      <BottomNav view={view} setView={setView} onNewSession={() => setShowNewSessionChooser(true)} />

      {showNewSessionChooser && (
        <NewSessionChooser
          presets={presets} exerciseList={exercises} currentUserId={userId} profiles={profiles} sessions={sessions}
          hasDraft={hasDraft}
          onCreatePreset={handleCreatePreset}
          onUpdatePreset={handleUpdatePreset}
          onDeletePreset={handleDeletePreset}
          onResume={() => { setShowNewSessionChooser(false); setView("log"); }}
          onStart={startNewSession}
          onClose={() => setShowNewSessionChooser(false)}
        />
      )}

      {modalSession && (
        <SessionModal
          session={modalSession} sessions={sessions} profiles={profiles} currentUserId={userId}
          exerciseList={exercises} otherProfiles={Object.values(profiles).filter((p) => p.id !== modalSession.creator)}
          presets={presets}
          onCreatePreset={handleCreatePreset}
          onUpdatePreset={handleUpdatePreset}
          onDeletePreset={handleDeletePreset}
          onClose={() => setModalSessionId(null)}
          onSubmitEntry={async (ex, details) => { await writeEntry(modalSession.id, userId, ex, details); await refreshSessions([modalSession.id]); }}
          onDeleteEntry={async () => { await deleteEntry(modalSession.id, userId); await refreshSessions([modalSession.id]); }}
          onEditSession={async (payload) => { await editSession(modalSession.id, payload); await refreshSessions([modalSession.id]); }}
          onDeleteSession={async () => { const id = modalSession.id; await deleteSession(id); setModalSessionId(null); await refreshSessions([id]); }}
        />
      )}
    </div>
    </FavoritesProvider>
  );
}
