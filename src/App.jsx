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
import { CalendarView } from "./components/CalendarView";
import { NewSession } from "./components/NewSession";
import { SessionModal } from "./components/SessionModal";
import { Friends } from "./components/Friends";
import { Leaderboard } from "./components/Leaderboard";

// Chargées à la demande : ce sont les deux seuls écrans qui importent recharts,
// pas besoin d'alourdir le chargement initial (Home/Calendrier/Log) avec ce poids.
const ProfileScreen = lazy(() => import("./components/ProfileScreen").then((m) => ({ default: m.ProfileScreen })));
const ExercisesLibrary = lazy(() => import("./components/ExercisesLibrary").then((m) => ({ default: m.ExercisesLibrary })));

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
    exercises, prs, presets, entries, loading, refresh,
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

  const handleCreatePreset = async (name, exs) => { await createPreset(name, exs, userId); await refresh(); };
  const handleUpdatePreset = async (id, name, exs) => { await updatePreset(id, name, exs); await refresh(); };
  const handleDeletePreset = async (id) => { await deletePreset(id); await refresh(); };

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
          <CalendarView
            sessions={sessions} hasMoreSessions={hasMoreSessions} onLoadMoreSessions={loadMoreSessions}
            profiles={profiles} currentUserId={userId} onOpenSession={setModalSessionId} onBack={() => setView("home")}
          />
        )}

        {view === "log" && (
          <NewSession
            currentUserId={userId} otherProfiles={otherProfiles} exerciseList={exercises} sessions={sessions}
            initialExercises={newSessionExercises}
            onSubmit={async (payload, ownExercises) => {
              await createSession(payload, userId, ownExercises);
              await refresh();
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
              onSave={async (partial) => { await updateProfile(userId, partial); await refresh(); }}
              onAddPr={async (exercise, value, unit) => { await addPR(userId, exercise, value, unit); await refresh(); }}
              onDeletePr={async (id) => { await deletePR(id); await refresh(); }}
              onOpenSession={setModalSessionId}
              onRefresh={refresh}
            />
          </Suspense>
        )}

        {view === "friends" && (
          <Friends currentUserId={userId} profiles={profiles} sessionShells={sessionShells} prsByUser={prsByUser} onOpenSession={setModalSessionId} />
        )}

        {view === "exercises" && (
          <Suspense fallback={<LazyFallback />}>
            <ExercisesLibrary
              exerciseList={exercises} currentUserId={userId} currentUsername={profile.username} profiles={profiles} onRefresh={refresh} presets={presets}
              onCreatePreset={handleCreatePreset}
              onUpdatePreset={handleUpdatePreset}
              onDeletePreset={handleDeletePreset}
            />
          </Suspense>
        )}

        {view === "leaderboard" && (
          <Leaderboard
            profiles={profiles} entries={entries} sessions={sessions} sessionShells={sessionShells} sessionCounts={sessionCounts}
            currentUserId={userId} exerciseList={exercises} prsByUser={prsByUser}
          />
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
          session={modalSession} profiles={profiles} currentUserId={userId}
          exerciseList={exercises} otherProfiles={Object.values(profiles).filter((p) => p.id !== modalSession.creator)}
          presets={presets}
          onCreatePreset={handleCreatePreset}
          onUpdatePreset={handleUpdatePreset}
          onDeletePreset={handleDeletePreset}
          onClose={() => setModalSessionId(null)}
          onSubmitEntry={async (ex, bodyweightKg, feeling, comment) => { await writeEntry(modalSession.id, userId, ex, bodyweightKg, feeling, comment); await refresh(); }}
          onDeleteEntry={async () => { await deleteEntry(modalSession.id, userId); await refresh(); }}
          onEditSession={async (payload) => { await editSession(modalSession.id, payload); await refresh(); }}
          onDeleteSession={async () => { await deleteSession(modalSession.id); setModalSessionId(null); await refresh(); }}
        />
      )}
    </div>
  );
}
