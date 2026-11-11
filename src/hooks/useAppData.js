import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { getAllProfiles } from "../lib/api/profiles";
import { getSessions, getSessionsByIds, getSessionShells, SESSIONS_PAGE_SIZE } from "../lib/api/sessions";
import { mergeSessions } from "../lib/utils";
import { loadCache, saveCache } from "../lib/cache";
import { getExercises } from "../lib/api/exercises";
import { getPresets } from "../lib/api/presets";

// Au retour sur l'app (onglet/PWA remis au premier plan), on recharge si le dernier
// chargement date de plus que ça : les events temps réel émis pendant que le
// téléphone dormait sont perdus.
const STALE_AFTER_MS = 30000;

// Centralise le chargement des données partagées et les tient à jour en live via
// Supabase Realtime : dès qu'un ami modifie une séance/entrée/profil/exercice, tout le
// monde voit le changement sans avoir à rafraîchir manuellement.
//
// Ouverture instantanée : l'état part du cache local (voir lib/cache.js), puis est
// remplacé par les données fraîches dès qu'elles arrivent.
//
// Le fil des séances (avec le détail complet exercices/séries de tout le monde)
// est paginé : seules les SESSIONS_PAGE_SIZE plus récentes sont chargées par
// défaut, et loadMoreSessions() permet d'aller chercher les plus anciennes à la
// demande (ex: le calendrier qui remonte dans le temps). Les écrans qui ont besoin
// de TOUT l'historique (liste d'amis) utilisent sessionShells, une
// version allégée sans exercices/séries, chargée seulement quand un de ces écrans
// la demande (loadShells).
//
// Rafraîchissement ciblé : un changement ne recharge que ce qui a bougé (la séance
// concernée, ou les profils, ou les exercices...), jamais tout. Les events sont regroupés
// sur 300 ms pour qu'une même écriture (plusieurs lignes) ne déclenche qu'un rechargement.
export function useAppData(userId) {
  const cached = useRef(loadCache()).current; // lu une seule fois, au montage
  const [profiles, setProfiles] = useState(cached?.data.profiles || {});
  const [sessions, setSessions] = useState(cached?.data.sessions || []);
  const [hasMoreSessions, setHasMoreSessions] = useState(cached?.data.hasMoreSessions ?? true);
  const [sessionShells, setSessionShells] = useState(null); // null = pas (encore) chargé
  const [exercises, setExercises] = useState(cached?.data.exercises || []);
  const [presets, setPresets] = useState(cached?.data.presets || []);
  const [loading, setLoading] = useState(false);
  // true dès qu'on a quelque chose de fiable à afficher (cache ou 1er chargement).
  const [ready, setReady] = useState(!!cached);

  // Copies à jour pour les callbacks Realtime (qui ne se ré-abonnent pas à chaque rendu).
  const sessionsRef = useRef(sessions);
  const hasMoreRef = useRef(hasMoreSessions);
  useEffect(() => { sessionsRef.current = sessions; hasMoreRef.current = hasMoreSessions; }, [sessions, hasMoreSessions]);

  // Recharge toute la fenêtre déjà chargée (au moins une page, plus si "charger
  // plus" l'a étendue, pour ne pas faire "oublier" les vieux mois du calendrier).
  const reloadSessionPage = useCallback(async () => {
    const page = await getSessions({ limit: Math.max(SESSIONS_PAGE_SIZE, sessionsRef.current.length) });
    setSessions(page.sessions);
    setHasMoreSessions(page.hasMore);
  }, []);

  const shellsWanted = useRef(false);
  const reloaders = useRef({
    profiles: async () => setProfiles(await getAllProfiles()),
    exercises: async () => setExercises(await getExercises()),
    presets: async () => setPresets(await getPresets()),
    // Version légère de tout l'historique : seulement si un écran l'a demandée.
    shells: async () => { if (shellsWanted.current) setSessionShells(await getSessionShells()); },
  });

  const loadShells = useCallback(() => {
    if (shellsWanted.current) return;
    shellsWanted.current = true;
    reloaders.current.shells().catch((e) => console.error("[useAppData] shells", e));
  }, []);

  const lastRefreshAt = useRef(0);
  const refresh = useCallback(async () => {
    setLoading(true);
    lastRefreshAt.current = Date.now();
    try {
      const r = reloaders.current;
      await Promise.all([r.profiles(), reloadSessionPage(), r.shells(), r.exercises(), r.presets()]);
      setReady(true);
    } catch (e) {
      // Hors ligne ou erreur réseau : on garde ce qui est affiché (cache).
      console.error("[useAppData] refresh", e);
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
    ["profiles", "exercises", "presets"].forEach((k) => { if (keys.has(k)) jobs.push(reloaders.current[k]()); });
    await Promise.all(jobs);
  }, [reloadSessionPage]);

  // Marque des données à recharger. Regroupé sur 300 ms pour le temps réel ;
  // immédiat (et attendu) après une action de l'utilisateur lui-même.
  const invalidate = useCallback(({ keys = [], sessionIds = [] }, { immediate = false } = {}) => {
    keys.forEach((k) => pending.current.keys.add(k));
    sessionIds.forEach((id) => id && pending.current.sessionIds.add(id));
    clearTimeout(flushTimer.current);
    if (immediate) return flush();
    flushTimer.current = setTimeout(() => flush().catch((e) => console.error("[useAppData] flush", e)), 300);
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
    // Cache d'un autre compte (cas rare : changement de compte) : on attend les
    // vraies données avant de considérer l'état comme fiable et de le remettre en cache.
    if (cached && cached.userId !== userId) setReady(false);
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
      .subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefreshAt.current > STALE_AFTER_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(flushTimer.current);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [userId, cached, refresh, invalidate]);

  // Sauvegarde du cache (après le 1er vrai chargement, regroupée sur 500 ms). On ne
  // garde que la première page de séances : le cache reste petit, et les pages plus
  // anciennes se rechargent à la demande.
  useEffect(() => {
    if (!userId || !ready) return;
    const timer = setTimeout(() => {
      const truncated = sessions.length > SESSIONS_PAGE_SIZE;
      saveCache(userId, {
        profiles, exercises, presets,
        sessions: truncated ? sessions.slice(0, SESSIONS_PAGE_SIZE) : sessions,
        hasMoreSessions: truncated || hasMoreSessions,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [userId, ready, profiles, sessions, hasMoreSessions, exercises, presets]);

  return {
    cachedUserId: cached?.userId || null, ready, loading,
    profiles, sessions, hasMoreSessions, loadMoreSessions,
    sessionShells, loadShells,
    exercises, presets, refreshSessions, refreshData,
  };
}
