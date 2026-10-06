import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Dumbbell } from "lucide-react";
import { styles } from "./lib/styles";
import { COLORS } from "./lib/constants";
import { getSession, onAuthStateChange } from "./lib/api/auth";
import { updateProfile, addPR, deletePR } from "./lib/api/profiles";
import { createSession, editSession, deleteSession, writeEntry, deleteEntry, getSessionById } from "./lib/api/sessions";
import { createPreset, updatePreset, deletePreset } from "./lib/api/presets";
import { presetToExercises } from "./lib/utils";
import { useAppData } from "./hooks/useAppData";

import { AuthScreen } from "./components/AuthScreen";
import { TopBar, BottomNav, NewSessionChooser } from "./components/Nav";
import { Home } from "./components/Home";
import { NewSession } from "./components/NewSession";
import { SessionModal } from "./components/SessionModal";

// Écrans secondaires chargés à la demande : le premier affichage (accueil, nouvelle
// séance) n'embarque que le nécessaire. Profil et Exercices importent recharts (lourd).
const ProfileScreen = lazy(() => import("./components/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const ExercisesLibrary = lazy(() => import("./components/ExercisesLibrary").then((m) => ({ default: m.ExercisesLibrary })));
const CalendarView = lazy(() => import("./components/CalendarView").then((m) => ({ default: m.CalendarView })));
const Friends = lazy(() => import("./components/Friends").then((m) => ({ default: m.Friends })));
const Leaderboard = lazy(() => import("./components/Leaderboard").then((m) => ({ default: m.Leaderboard })));

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
  const [newSessionExercises, setNewSessionExercises] = useState(null);

  useEffect(() => {
    getSession().then((s) => { setAuthSession(s); setBooting(false); });
    const sub = onAuthStateChange((s) => setAuthSession(s));
    return () => sub.unsubscribe();
  }, []);

  const userId = authSession?.user?.id || null;
  const {
    profiles, sessions, hasMoreSessions, loadMoreSessions, sessionShells, sessionCounts,
    exercises, prs, presets, entries, loading, refreshSessions, refreshData,
  } = useAppData(userId);

  const prsByUser = useMemo(() => {
    const map = {};
    prs.forEach((pr) => { (map[pr.user_id] = map[pr.user_id] || []).push(pr); });
    return map;
  }, [prs]);

  const otherProfiles = useMemo(() => Object.values(profiles).filter((p) => p.id !== userId), [profiles, userId]);

  // La séance ouverte peut être hors de la fenêtre paginée (ex: ouverte depuis
  // l'historique complet d'un profil) : dans ce cas on va la chercher directement.
  const [fetchedModalSession, setFetchedModalSession] = useState(null);
  const modalSessionInWindow = modalSessionId ? sessions.find((s) => s.id === modalSessionId) : null;
  useEffect(() => {
    if (!modalSessionId || modalSessionInWindow) { setFetchedModalSession(null); return; }
    getSessionById(modalSessionId).then(setFetchedModalSession);
  }, [modalSessionId, modalSessionInWindow]);
  const modalSession = modalSessionInWindow || (fetchedModalSession?.id === modalSessionId ? fetchedModalSession : null);

  const handleCreatePreset = async (name, exs) => { await createPreset(name, exs, userId); await refreshData("presets"); };
  const handleUpdatePreset = async (id, name, exs) => { await updatePreset(id, name, exs); await refreshData("presets"); };
  const handleDeletePreset = async (id) => { await deletePreset(id); await refreshData("presets"); };

  if (booting) {
    return (
      <div style={styles.bootScreen}>
        <Dumbbell size={28} color={COLORS.lime} />
      </div>
    );
  }

  if (!authSession) return <AuthScreen />;

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
    <div style={styles.app}>
      <TopBar profile={profile} />
      <div style={styles.content}>
        {loading && <div style={styles.loadingBar} />}

        {view === "home" && (
          <Home
            currentUserId={userId} profiles={profiles} sessions={sessions}
            onOpenSession={setModalSessionId}
            onNewSession={() => setShowNewSessionChooser(true)}
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
            initialExercises={newSessionExercises}
            onSubmit={async (payload, ownExercises) => {
              const newId = await createSession(payload, userId, ownExercises);
              await refreshSessions([newId]);
              setNewSessionExercises(null);
              setView("home");
            }}
            onCancel={() => { setNewSessionExercises(null); setView("home"); }}
          />
        )}

        {view === "profile" && (
          <Suspense fallback={<LazyFallback />}>
            <ProfileScreen
              currentUserId={userId} profile={profile}
              prs={prsByUser[userId] || []} exerciseList={exercises}
              onSave={async (partial) => { await updateProfile(userId, partial); await refreshData("profiles"); }}
              onAddPr={async (exercise, value, unit) => { await addPR(userId, exercise, value, unit); await refreshData("prs"); }}
              onDeletePr={async (id) => { await deletePR(id); await refreshData("prs"); }}
              onOpenSession={setModalSessionId}
              onRefresh={() => refreshData("profiles")}
            />
          </Suspense>
        )}

        {view === "friends" && (
          <Suspense fallback={<LazyFallback />}>
            <Friends currentUserId={userId} profiles={profiles} sessionShells={sessionShells} prsByUser={prsByUser} onOpenSession={setModalSessionId} />
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

        {view === "leaderboard" && (
          <Suspense fallback={<LazyFallback />}>
            <Leaderboard
              profiles={profiles} entries={entries} sessions={sessions} sessionShells={sessionShells} sessionCounts={sessionCounts}
              currentUserId={userId} exerciseList={exercises} prsByUser={prsByUser}
            />
          </Suspense>
        )}
      </div>
      <BottomNav view={view} setView={setView} onNewSession={() => setShowNewSessionChooser(true)} />

      {showNewSessionChooser && (
        <NewSessionChooser
          presets={presets} exerciseList={exercises} currentUserId={userId} profiles={profiles}
          onCreatePreset={handleCreatePreset}
          onUpdatePreset={handleUpdatePreset}
          onDeletePreset={handleDeletePreset}
          onBlank={() => { setNewSessionExercises(null); setShowNewSessionChooser(false); setView("log"); }}
          onPreset={(preset) => { setNewSessionExercises(presetToExercises(preset)); setShowNewSessionChooser(false); setView("log"); }}
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
          onSubmitEntry={async (ex, bodyweightKg, feeling, comment) => { await writeEntry(modalSession.id, userId, ex, bodyweightKg, feeling, comment); await refreshSessions([modalSession.id]); }}
          onDeleteEntry={async () => { await deleteEntry(modalSession.id, userId); await refreshSessions([modalSession.id]); }}
          onEditSession={async (payload) => { await editSession(modalSession.id, payload); await refreshSessions([modalSession.id]); }}
          onDeleteSession={async () => { const id = modalSession.id; await deleteSession(id); setModalSessionId(null); await refreshSessions([id]); }}
        />
      )}
    </div>
  );
}
