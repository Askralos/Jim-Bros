import { useState, useEffect, useMemo } from "react";
import { Dumbbell } from "lucide-react";
import { styles } from "./lib/styles";
import { COLORS } from "./lib/constants";
import { getSession, onAuthStateChange } from "./lib/api/auth";
import { updateProfile, addPR, deletePR } from "./lib/api/profiles";
import { createSession, editSession, deleteSession, writeEntry, deleteEntry } from "./lib/api/sessions";
import { createPreset, updatePreset, deletePreset } from "./lib/api/presets";
import { useAppData } from "./hooks/useAppData";

import { AuthScreen } from "./components/AuthScreen";
import { TopBar, BottomNav, NewSessionChooser } from "./components/Nav";
import { Home } from "./components/Home";
import { CalendarView } from "./components/CalendarView";
import { NewSession } from "./components/NewSession";
import { SessionModal } from "./components/SessionModal";
import { ProfileScreen } from "./components/ProfileScreen";
import { Friends } from "./components/Friends";
import { ExercisesLibrary } from "./components/ExercisesLibrary";
import { Leaderboard } from "./components/Leaderboard";

const presetToExercises = (preset) =>
  preset.exercises.map((ex) => ({
    name: ex.name,
    sets: Array.from({ length: ex.setCount }, () => ({ reps: "", weight: "", weightType: "external", mode: "reps", seconds: "" })),
  }));

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
  const { profiles, sessions, exercises, prs, presets, entries, entriesBySession, loading, refresh } = useAppData(userId);

  const prsByUser = useMemo(() => {
    const map = {};
    prs.forEach((pr) => { (map[pr.user_id] = map[pr.user_id] || []).push(pr); });
    return map;
  }, [prs]);

  const otherProfiles = useMemo(() => Object.values(profiles).filter((p) => p.id !== userId), [profiles, userId]);
  const modalSession = modalSessionId ? sessions.find((s) => s.id === modalSessionId) : null;

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
          <CalendarView sessions={sessions} profiles={profiles} onOpenSession={setModalSessionId} onBack={() => setView("home")} />
        )}

        {view === "log" && (
          <NewSession
            currentUserId={userId} otherProfiles={otherProfiles} exerciseList={exercises}
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
          <ProfileScreen
            currentUserId={userId} profile={profile} entries={entries} sessions={sessions}
            prs={prsByUser[userId] || []} exerciseList={exercises}
            onSave={async (partial) => { await updateProfile(userId, partial); await refresh(); }}
            onAddPr={async (exercise, value, unit) => { await addPR(userId, exercise, value, unit); await refresh(); }}
            onDeletePr={async (id) => { await deletePR(id); await refresh(); }}
            onOpenSession={setModalSessionId}
            onRefresh={refresh}
          />
        )}

        {view === "friends" && (
          <Friends currentUserId={userId} profiles={profiles} entries={entries} sessions={sessions} prsByUser={prsByUser} onOpenSession={setModalSessionId} />
        )}

        {view === "exercises" && (
          <ExercisesLibrary
            exerciseList={exercises} currentUserId={userId} currentUsername={profile.username} onRefresh={refresh} presets={presets}
            onCreatePreset={async (name, exs) => { await createPreset(name, exs, userId); await refresh(); }}
            onUpdatePreset={async (id, name, exs) => { await updatePreset(id, name, exs); await refresh(); }}
            onDeletePreset={async (id) => { await deletePreset(id); await refresh(); }}
          />
        )}

        {view === "leaderboard" && (
          <Leaderboard profiles={profiles} entries={entries} sessions={sessions} currentUserId={userId} exerciseList={exercises} prsByUser={prsByUser} />
        )}
      </div>
      <BottomNav view={view} setView={setView} onNewSession={() => setShowNewSessionChooser(true)} />

      {showNewSessionChooser && (
        <NewSessionChooser
          presets={presets}
          onBlank={() => { setNewSessionExercises(null); setShowNewSessionChooser(false); setView("log"); }}
          onPreset={(preset) => { setNewSessionExercises(presetToExercises(preset)); setShowNewSessionChooser(false); setView("log"); }}
          onClose={() => setShowNewSessionChooser(false)}
        />
      )}

      {modalSession && (
        <SessionModal
          session={modalSession} profiles={profiles} currentUserId={userId}
          exerciseList={exercises} otherProfiles={Object.values(profiles).filter((p) => p.id !== modalSession.creator)}
          onClose={() => setModalSessionId(null)}
          onSubmitEntry={async (ex, bodyweightKg) => { await writeEntry(modalSession.id, userId, ex, bodyweightKg); await refresh(); }}
          onDeleteEntry={async () => { await deleteEntry(modalSession.id, userId); await refresh(); }}
          onEditSession={async (payload) => { await editSession(modalSession.id, payload); await refresh(); }}
          onDeleteSession={async () => { await deleteSession(modalSession.id); setModalSessionId(null); await refresh(); }}
        />
      )}
    </div>
  );
}
