import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getAllProfiles, getAllPRs } from "../lib/api/profiles";
import { getSessions, getSessionsByIds, getSessionShells, getSessionCountsByUser, SESSIONS_PAGE_SIZE } from "../lib/api/sessions";
import { mergeSessions } from "../lib/utils";
import { getExercises } from "../lib/api/exercises";
import { getPresets } from "../lib/api/presets";

// Centralise le chargement des données partagées et les tient à jour en live via
// Supabase Realtime : dès qu'un ami modifie une séance/entrée/PR/exercice, tout le
// monde voit le changement sans avoir à rafraîchir manuellement.
//
// Le fil des séances (avec le détail complet exercices/séries de tout le monde)
// est paginé : seules les SESSIONS_PAGE_SIZE plus récentes sont chargées par
// défaut, et loadMoreSessions() permet d'aller chercher les plus anciennes à la
// demande (ex: le calendrier qui remonte dans le temps). Les écrans qui ont besoin
// de TOUT l'historique (classement, liste d'amis) utilisent sessionShells, une
// version allégée sans exercices/séries, bien moins coûteuse sur tout l'historique.
//
// Rafraîchissement ciblé : un changement ne recharge que ce qui a bougé (la séance
// concernée, ou les profils, ou les PR...), jamais tout. Les events sont regroupés
// sur 300 ms pour qu'une même écriture (plusieurs lignes) ne déclenche qu'un rechargement.
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

  // Copies à jour pour les callbacks Realtime (qui ne se ré-abonnent pas à chaque rendu).
  const sessionsRef = useRef([]);
  const hasMoreRef = useRef(true);
  useEffect(() => { sessionsRef.current = sessions; hasMoreRef.current = hasMoreSessions; }, [sessions, hasMoreSessions]);

  // Recharge toute la fenêtre déjà chargée (au moins une page, plus si "charger
  // plus" l'a étendue, pour ne pas faire "oublier" les vieux mois du calendrier).
  const reloadSessionPage = useCallback(async () => {
    const page = await getSessions({ limit: Math.max(SESSIONS_PAGE_SIZE, sessionsRef.current.length) });
    setSessions(page.sessions);
    setHasMoreSessions(page.hasMore);
  }, []);

  const reloaders = useRef({
    profiles: async () => setProfiles(await getAllProfiles()),
    exercises: async () => setExercises(await getExercises()),
    prs: async () => setPrs(await getAllPRs()),
    presets: async () => setPresets(await getPresets()),
    // Version légère de tout l'historique + compteurs : à recharger dès qu'une séance bouge.
    shells: async () => {
      const [shells, counts] = await Promise.all([getSessionShells(), getSessionCountsByUser()]);
      setSessionShells(shells);
      setSessionCounts(counts);
    },
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = reloaders.current;
      await Promise.all([r.profiles(), reloadSessionPage(), r.shells(), r.exercises(), r.prs(), r.presets()]);
    } finally {
      setLoading(false);
    }
  }, [reloadSessionPage]);

  const pending = useRef({ keys: new Set(), sessionIds: new Set() });
  const flushTimer = useRef(null);

  const flush = useCallback(async () => {
    clearTimeout(flushTimer.current);
    const { keys, sessionIds } = pending.current;
    pending.current = { keys: new Set(), sessionIds: new Set() };
    const jobs = [];
    if (keys.has("allSessions")) {
      jobs.push(reloadSessionPage());
    } else if (sessionIds.size) {
      const ids = [...sessionIds];
      jobs.push(getSessionsByIds(ids).then((fetched) =>
        setSessions((prev) => mergeSessions(prev, fetched, ids, { hasMore: hasMoreRef.current }))
      ));
    }
    if (keys.has("allSessions") || sessionIds.size) jobs.push(reloaders.current.shells());
    ["profiles", "exercises", "prs", "presets"].forEach((k) => { if (keys.has(k)) jobs.push(reloaders.current[k]()); });
    await Promise.all(jobs);
  }, [reloadSessionPage]);

  // Marque des données à recharger. Regroupé sur 300 ms pour le temps réel ;
  // immédiat (et attendu) après une action de l'utilisateur lui-même.
  const invalidate = useCallback(({ keys = [], sessionIds = [] }, { immediate = false } = {}) => {
    keys.forEach((k) => pending.current.keys.add(k));
    sessionIds.forEach((id) => id && pending.current.sessionIds.add(id));
    clearTimeout(flushTimer.current);
    if (immediate) return flush();
    flushTimer.current = setTimeout(flush, 300);
  }, [flush]);

  const refreshSessions = useCallback((ids) => invalidate({ sessionIds: ids }, { immediate: true }), [invalidate]);
  const refreshData = useCallback((...keys) => invalidate({ keys }, { immediate: true }), [invalidate]);

  const loadingMoreRef = useRef(false);
  const loadMoreSessions = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreSessions || sessions.length === 0) return;
    loadingMoreRef.current = true;
    try {
      const last = sessions[sessions.length - 1];
      const { sessions: more, hasMore } = await getSessions({
        before: { date: last.date, createdAt: new Date(last.createdAt).toISOString() },
      });
      setSessions((prev) => [...prev, ...more]);
      setHasMoreSessions(hasMore);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMoreSessions, sessions]);

  useEffect(() => {
    if (!userId) return;
    refresh();

    // Les events de suppression ne contiennent que la clé primaire (old), d'où les
    // replis : session_participants a session_id dans sa clé ; pour une entrée
    // supprimée, on retrouve sa séance dans ce qui est chargé, sinon on recharge la page.
    // Les tables exercices/séries d'une entrée ne sont pas suivies : writeEntry
    // termine par une mise à jour de session_entries, qui sert de signal.
    const rowOf = (payload) => (payload.new && Object.keys(payload.new).length ? payload.new : payload.old || {});
    const on = (table, handler) => ["postgres_changes", { event: "*", schema: "public", table }, (payload) => handler(rowOf(payload))];

    const channel = supabase
      .channel("iron-squad-live")
      .on(...on("sessions", (row) => invalidate({ sessionIds: [row.id] })))
      .on(...on("session_participants", (row) => invalidate({ sessionIds: [row.session_id] })))
      .on(...on("session_entries", (row) => {
        if (row.session_id) return invalidate({ sessionIds: [row.session_id] });
        const owner = sessionsRef.current.find((s) => Object.values(s.entries).some((e) => e.entryId === row.id));
        invalidate(owner ? { sessionIds: [owner.id] } : { keys: ["allSessions"] });
      }))
      .on(...on("profiles", () => invalidate({ keys: ["profiles"] })))
      .on(...on("exercises", () => invalidate({ keys: ["exercises"] })))
      .on(...on("personal_records", () => invalidate({ keys: ["prs"] })))
      .subscribe();

    return () => {
      clearTimeout(flushTimer.current);
      supabase.removeChannel(channel);
    };
  }, [userId, refresh, invalidate]);

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
    exercises, prs, presets, entries, entriesBySession, loading, refresh, refreshSessions, refreshData,
  };
}
