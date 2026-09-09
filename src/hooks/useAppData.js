import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getAllProfiles, getAllPRs } from "../lib/api/profiles";
import { getSessions } from "../lib/api/sessions";
import { getExercises } from "../lib/api/exercises";
import { getPresets } from "../lib/api/presets";

// Centralise le chargement des données partagées et les tient à jour en live via
// Supabase Realtime : dès qu'un ami modifie une séance/entrée/PR/exercice, tout le
// monde voit le changement sans avoir à rafraîchir manuellement.
// -> Pense à activer "Realtime" sur les tables sessions, session_entries,
//    entry_exercises, entry_sets, exercises, personal_records, profiles
//    (Supabase Dashboard > Database > Replication).
export function useAppData(userId) {
  const [profiles, setProfiles] = useState({});
  const [sessions, setSessions] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [prs, setPrs] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [profilesMap, sessionsList, exercisesList, prsList, presetsList] = await Promise.all([
        getAllProfiles(),
        getSessions(),
        getExercises(),
        getAllPRs(),
        getPresets(),
      ]);
      setProfiles(profilesMap);
      setSessions(sessionsList);
      setExercises(exercisesList);
      setPrs(prsList);
      setPresets(presetsList);
    } finally {
      setLoading(false);
    }
  }, []);

  // Une écriture (ex: créer une séance) déclenche plusieurs events Realtime d'un
  // coup (sessions + entry_exercises + entry_sets...). On les regroupe pour ne
  // faire qu'un seul refresh (5 requêtes) au lieu d'un par event.
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
  // pratique pour les calculs transverses (profil, amis, classement).
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

  return { profiles, sessions, exercises, prs, presets, entries, entriesBySession, loading, refresh };
}
