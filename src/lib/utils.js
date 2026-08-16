export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);

export const fmtDate = (key) => {
  const d = new Date(key + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const norm = (s) => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function volumeOf(exercises) {
  if (!exercises) return 0;
  return exercises.reduce(
    (tot, ex) =>
      tot + ex.sets.reduce((s, set) => s + (set.bodyweight ? 0 : (Number(set.reps) || 0) * (Number(set.weight) || 0)), 0),
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
      const best = Math.max(0, ...ex.sets.filter((s) => !s.bodyweight).map((s) => Number(s.weight) || 0));
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
