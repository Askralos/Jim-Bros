import { useState, useEffect, useCallback, useMemo } from "react";
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

  useEffect(() => {
    if (!userId) return;
    refresh();

    const channel = supabase
      .channel("iron-squad-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_entries" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "entry_exercises" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "entry_sets" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "exercises" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_records" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_presets" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "preset_exercises" }, refresh)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

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
