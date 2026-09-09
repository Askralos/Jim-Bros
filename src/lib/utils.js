export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export const fmtDate = (key) => {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

// Heure de création (session.createdAt, un timestamp ms) au format "14:32".
export const fmtTime = (ms) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// Convertit les exercices d'un preset (nom + nombre de series + eventuel temps de
// repos/objectif de reps par defaut) en exercices prets pour ExercisesEditor (series
// vides a remplir, mais deja pre-remplies de repos/objectif si le preset en a).
// Sert aussi bien a demarrer une seance depuis un preset qu'a laisser un participant
// remplir ses propres stats a partir d'un preset.
export const presetToExercises = (preset) =>
  preset.exercises.map((ex) => ({
    name: ex.name,
    sets: Array.from({ length: ex.setCount }, () => ({
      reps: "", weight: "", weightType: "external", mode: ex.mode === "time" ? "time" : "reps", seconds: "",
      restSeconds: ex.restSeconds != null ? String(ex.restSeconds) : "",
      targetMin: ex.targetMin != null ? String(ex.targetMin) : "",
      targetMax: ex.targetMax != null ? String(ex.targetMax) : "",
    })),
  }));

// Charge effective d'une série selon son type (voir ExercisesEditor pour l'UI) :
// - external : la charge saisie telle quelle
// - bodyweight : le poids du corps figé sur l'entrée (snapshot au moment de la saisie)
// - bodyweight_plus : poids du corps + lest ajouté
// - assisted : poids du corps - assistance de la machine
export function effectiveSetLoad(set, bodyweightKg) {
  const bw = Number(bodyweightKg) || 0;
  const w = Number(set.weight) || 0;
  switch (set.weightType) {
    case "bodyweight": return bw;
    case "bodyweight_plus": return bw + w;
    case "assisted": return Math.max(0, bw - w);
    default: return w;
  }
}

// bodyweightKg : snapshot du poids figé sur l'entrée (session_entries.bodyweight_kg).
// Les séries en mode "temps" (mode === "time") ne comptent pas dans le tonnage.
export function volumeOf(exercises, bodyweightKg) {
  if (!exercises) return 0;
  return exercises.reduce(
    (tot, ex) =>
      tot +
      ex.sets.reduce((s, set) => {
        if (set.mode === "time") return s;
        return s + (Number(set.reps) || 0) * effectiveSetLoad(set, bodyweightKg);
      }, 0),
    0
  );
}

// Redimensionne et compresse une image côté client avant upload (limite la taille
// des fichiers envoyés à Supabase Storage). Retourne un Blob prêt à uploader.
export function compressImageToBlob(file, maxW = 480, quality = 0.6) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Échec de compression"))), "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Entrées d'un user + exercice où sa charge a le plus progressé (1re séance -> meilleure séance)
export function computeProfileInsights(userId, entries, sessions) {
  const myEntries = entries
    .filter((e) => e.userId === userId)
    .map((e) => ({ ...e, session: sessions.find((s) => s.id === e.sessionId) }))
    .filter((e) => e.session)
    .sort((a, b) => (a.session.date < b.session.date ? 1 : -1));

  const byExo = {};
  [...myEntries].sort((a, b) => (a.session.date > b.session.date ? 1 : -1)).forEach((e) => {
    e.exercises.forEach((ex) => {
      const best = Math.max(0, ...ex.sets.filter((s) => s.weightType === "external").map((s) => Number(s.weight) || 0));
      if (!best) return;
      if (!byExo[ex.name]) byExo[ex.name] = { first: best, best };
      else if (best > byExo[ex.name].best) byExo[ex.name].best = best;
    });
  });
  let bestProgress = null;
  Object.entries(byExo).forEach(([name, v]) => {
    const delta = v.best - v.first;
    if (delta > 0 && (!bestProgress || delta > bestProgress.delta)) bestProgress = { name, delta, first: v.first, best: v.best };
  });

  return { myEntries, bestProgress };
}

// Formate une série pour un affichage compact ("10×50kg", "8 PDC+5kg", "45s"...).
// Utilisé pour la comparaison avec une séance passée (pas besoin des infos
// contextuelles complètes, juste une lecture rapide).
export function formatSet(s) {
  if (s.mode === "time") return `${s.seconds}s`;
  const suffix =
    s.weightType === "bodyweight" ? " PDC" :
    s.weightType === "bodyweight_plus" ? ` PDC+${s.weight}kg` :
    s.weightType === "assisted" ? ` PDC-${s.weight}kg` :
    `×${s.weight}kg`;
  return `${s.reps}${suffix}`;
}

// Historique par exercice d'un user : { [nomExercice]: [{date, sessionId, setIndex, reps, weight}, ...] }
// UNE ENTREE PAR SERIE (pas juste la meilleure), triée chronologiquement (date de la
// séance puis position dans la séance). Sert à l'onglet "Suivi" (graphique par exercice).
// Ne couvre que les séries en mode "reps" (les séries en temps n'ont pas de charge/reps
// comparables).
export function exerciseSetHistoryByName(entries, sessions, userId) {
  const byName = {};
  entries
    .filter((e) => e.userId === userId)
    .forEach((e) => {
      const session = sessions.find((s) => s.id === e.sessionId);
      if (!session) return;
      e.exercises.forEach((ex) => {
        ex.sets.forEach((s, i) => {
          if (s.mode === "time") return;
          const reps = Number(s.reps) || 0;
          if (!reps) return;
          const weight = effectiveSetLoad(s, e.bodyweightKg);
          (byName[ex.name] = byName[ex.name] || []).push({ date: session.date, sessionId: session.id, setIndex: i, reps, weight });
        });
      });
    });
  Object.values(byName).forEach((arr) =>
    arr.sort((a, b) => (a.date === b.date ? a.setIndex - b.setIndex : a.date < b.date ? -1 : 1))
  );
  return byName;
}

// Streak tolérant à 1 jour de repos entre deux séances (utile pour un split PPL avec repos)
export function computeStreak(datesDesc) {
  if (!datesDesc.length) return 0;
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  if (datesDesc[0] !== today && datesDesc[0] !== yesterday) return 0;
  let count = 1;
  for (let i = 0; i < datesDesc.length - 1; i++) {
    const gapDays = Math.round((new Date(datesDesc[i] + "T00:00:00") - new Date(datesDesc[i + 1] + "T00:00:00")) / 86400000);
    if (gapDays <= 2) count++;
    else break;
  }
  return count;
}
