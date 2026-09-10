import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getAllProfiles, getAllPRs } from "../lib/api/profiles";
import { getSessions, getSessionShells, getSessionCountsByUser, SESSIONS_PAGE_SIZE } from "../lib/api/sessions";
import { getExercises } from "../lib/api/exercises";
import { getPresets } from "../lib/api/presets";

// Centralise le chargement des données partagées et les tient à jour en live via
// Supabase Realtime : dès qu'un ami modifie une séance/entrée/PR/exercice, tout le
// monde voit le changement sans avoir à rafraîchir manuellement.
// -> Pense à activer "Realtime" sur les tables sessions, session_entries,
//    entry_exercises, entry_sets, exercises, personal_records, profiles
//    (Supabase Dashboard > Database > Replication).
//
// Le fil des séances (avec le détail complet exercices/séries de tout le monde)
// est paginé : seules les SESSIONS_PAGE_SIZE plus récentes sont chargées par
// défaut, et loadMoreSessions() permet d'aller chercher les plus anciennes à la
// demande (ex: le calendrier qui remonte dans le temps). Les écrans qui ont besoin
// de TOUT l'historique (classement, liste d'amis) utilisent sessionShells, une
// version allégée sans exercices/séries, bien moins coûteuse sur tout l'historique.
export function useAppData(userId) {
  const [profiles, setProfiles] = useState({});
  const [sessions, setSessions] = useState([]);
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [sessionShells, setSessionShells] = useState([]);
  const [sessionCounts, setSessionCounts] = useState({});
  const [exercises, setExercises] = useState([]);
  const [prs, setPrs] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Combien de séances doit-on recharger au prochain refresh() : au moins la
  // taille d'une page, mais plus si loadMoreSessions() a déjà étendu la fenêtre
  // (sinon un refresh déclenché par Realtime ferait "oublier" les séances plus
  // anciennes déjà chargées, ex: pendant qu'on navigue dans un vieux mois du calendrier).
  const loadedCountRef = useRef(SESSIONS_PAGE_SIZE);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesMap, sessionsPage, shells, exercisesList, prsList, presetsList, counts] = await Promise.all([
        getAllProfiles(),
        getSessions({ limit: loadedCountRef.current }),
        getSessionShells(),
        getExercises(),
        getAllPRs(),
        getPresets(),
        getSessionCountsByUser(),
      ]);
      setProfiles(profilesMap);
      setSessions(sessionsPage.sessions);
      setHasMoreSessions(sessionsPage.hasMore);
      setSessionShells(shells);
      setExercises(exercisesList);
      setPrs(prsList);
      setPresets(presetsList);
      setSessionCounts(counts);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadingMoreRef = useRef(false);
  const loadMoreSessions = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreSessions || sessions.length === 0) return;
    loadingMoreRef.current = true;
    try {
      const last = sessions[sessions.length - 1];
      const { sessions: more, hasMore } = await getSessions({
        before: { date: last.date, createdAt: new Date(last.createdAt).toISOString() },
      });
      loadedCountRef.current += more.length;
      setSessions((prev) => [...prev, ...more]);
      setHasMoreSessions(hasMore);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMoreSessions, sessions]);

  // Une écriture (ex: créer une séance) déclenche plusieurs events Realtime d'un
  // coup (sessions + entry_exercises + entry_sets...). On les regroupe pour ne
  // faire qu'un seul refresh (7 requêtes) au lieu d'un par event.
  const refreshTimer = useRef(null);
  const scheduleRefresh = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(refresh, 300);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    refresh();

    const channel = supabase
      .channel("iron-squad-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_entries" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "entry_exercises" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "entry_sets" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercises" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_records" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_presets" }, scheduleRefresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "preset_exercises" }, scheduleRefresh)
      .subscribe();

    return () => {
      clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, scheduleRefresh]);

  // Aplati session.entries en un tableau plat {sessionId, userId, exercises, photo, submittedAt},
  // pratique pour les calculs transverses sur la fenêtre chargée (comparaison de
  // séances passées, volume du feed...).
  const entries = useMemo(() => {
    const flat = [];
    sessions.forEach((s) => {
      Object.entries(s.entries || {}).forEach(([uid, e]) => flat.push({ ...e, sessionId: s.id, userId: uid }));
    });
    return flat;
  }, [sessions]);

  const entriesBySession = useMemo(() => {
    const map = {};
    entries.forEach((e) => {
      map[e.sessionId] = map[e.sessionId] || {};
      map[e.sessionId][e.userId] = e;
    });
    return map;
  }, [entries]);

  return {
    profiles, sessions, hasMoreSessions, loadMoreSessions,
    sessionShells, sessionCounts,
    exercises, prs, presets, entries, entriesBySession, loading, refresh,
  };
}
