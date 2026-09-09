import { describe, it, expect } from "vitest";
import {
  presetToExercises,
  effectiveSetLoad,
  volumeOf,
  formatSet,
  exerciseSetHistoryByName,
  computeStreak,
  todayKey,
} from "./utils";

describe("presetToExercises", () => {
  it("reporte le mode 'time' et l'objectif du preset sur chaque série générée", () => {
    const preset = { exercises: [{ name: "Gainage", setCount: 3, mode: "time", restSeconds: 45, targetMin: 30, targetMax: 60 }] };
    const [ex] = presetToExercises(preset);
    expect(ex.sets).toHaveLength(3);
    expect(ex.sets.every((s) => s.mode === "time")).toBe(true);
    expect(ex.sets[0]).toMatchObject({ targetMin: "30", targetMax: "60", restSeconds: "45", reps: "", seconds: "" });
  });

  it("preset sans mode explicite (ancien preset) -> 'reps' par défaut", () => {
    const preset = { exercises: [{ name: "Squat", setCount: 2 }] };
    const [ex] = presetToExercises(preset);
    expect(ex.sets[0].mode).toBe("reps");
    expect(ex.sets[0].restSeconds).toBe("");
    expect(ex.sets[0].targetMin).toBe("");
  });
});

describe("effectiveSetLoad", () => {
  it("charge externe : la valeur saisie telle quelle", () => {
    expect(effectiveSetLoad({ weightType: "external", weight: 80 }, 70)).toBe(80);
  });
  it("bodyweight : le poids du corps snapshot", () => {
    expect(effectiveSetLoad({ weightType: "bodyweight", weight: "" }, 70)).toBe(70);
  });
  it("bodyweight_plus : poids du corps + lest", () => {
    expect(effectiveSetLoad({ weightType: "bodyweight_plus", weight: 10 }, 70)).toBe(80);
  });
  it("assisted : poids du corps - assistance, jamais négatif", () => {
    expect(effectiveSetLoad({ weightType: "assisted", weight: 20 }, 70)).toBe(50);
    expect(effectiveSetLoad({ weightType: "assisted", weight: 100 }, 70)).toBe(0);
  });
});

describe("volumeOf", () => {
  it("ignore les séries en mode 'time' dans le tonnage", () => {
    const exercises = [
      { sets: [{ mode: "reps", reps: 10, weightType: "external", weight: 50 }, { mode: "time", seconds: 30 }] },
    ];
    expect(volumeOf(exercises, 0)).toBe(500);
  });
  it("retourne 0 si pas d'exercices", () => {
    expect(volumeOf(null, 70)).toBe(0);
  });
});

describe("formatSet", () => {
  it("formate une série en temps", () => {
    expect(formatSet({ mode: "time", seconds: 45 })).toBe("45s");
  });
  it("formate une série en reps avec charge externe", () => {
    expect(formatSet({ reps: 10, weightType: "external", weight: 50 })).toBe("10×50kg");
  });
  it("formate une série au poids du corps", () => {
    expect(formatSet({ reps: 12, weightType: "bodyweight" })).toBe("12 PDC");
  });
});

describe("exerciseSetHistoryByName", () => {
  it("une entrée par série (pas juste la meilleure), triée chronologiquement", () => {
    const sessions = [{ id: "s1", date: "2026-01-01" }, { id: "s2", date: "2026-01-08" }];
    const entries = [
      { userId: "u1", sessionId: "s1", bodyweightKg: 70, exercises: [{ name: "Squat", sets: [
        { mode: "reps", reps: 10, weightType: "external", weight: 50 },
        { mode: "reps", reps: 8, weightType: "external", weight: 55 },
      ] }] },
      { userId: "u1", sessionId: "s2", bodyweightKg: 70, exercises: [{ name: "Squat", sets: [
        { mode: "reps", reps: 5, weightType: "external", weight: 60 },
      ] }] },
    ];
    const byName = exerciseSetHistoryByName(entries, sessions, "u1");
    expect(byName.Squat).toHaveLength(3);
    expect(byName.Squat.map((p) => p.weight)).toEqual([50, 55, 60]);
  });

  it("ignore les séries en mode 'time' et les autres users", () => {
    const sessions = [{ id: "s1", date: "2026-01-01" }];
    const entries = [
      { userId: "u1", sessionId: "s1", bodyweightKg: 70, exercises: [{ name: "Gainage", sets: [{ mode: "time", seconds: 30 }] }] },
      { userId: "u2", sessionId: "s1", bodyweightKg: 70, exercises: [{ name: "Squat", sets: [{ mode: "reps", reps: 10, weightType: "external", weight: 50 }] }] },
    ];
    expect(exerciseSetHistoryByName(entries, sessions, "u1")).toEqual({});
  });
});

describe("computeStreak", () => {
  it("0 si la dernière séance ne date pas d'hier/aujourd'hui", () => {
    expect(computeStreak(["2020-01-01"])).toBe(0);
  });
  it("compte les séances consécutives (tolère jusqu'à 2 jours d'écart)", () => {
    const today = todayKey();
    const d = (n) => todayKey(new Date(Date.now() - n * 86400000));
    expect(computeStreak([today, d(2), d(4)])).toBe(3);
  });
  it("s'arrête au premier trou de plus de 2 jours", () => {
    const today = todayKey();
    const d = (n) => todayKey(new Date(Date.now() - n * 86400000));
    expect(computeStreak([today, d(2), d(10)])).toBe(2);
  });
});
