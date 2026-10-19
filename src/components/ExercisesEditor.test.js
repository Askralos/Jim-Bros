import { describe, it, expect, vi } from "vitest";

// Le composant importe (indirectement) le client Supabase, inutile ici.
vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
import { cleanExercises, EMPTY_SET } from "./ExercisesEditor";

describe("cleanExercises", () => {
  it("garde un exercice choisi même si aucune série n'est remplie", () => {
    const out = cleanExercises([
      { name: "Squat", supersetGroup: null, sets: [{ ...EMPTY_SET }, { ...EMPTY_SET }] },
      { name: "", supersetGroup: null, sets: [{ ...EMPTY_SET, reps: "10" }] },
    ]);
    expect(out.map((e) => [e.name, e.sets.length])).toEqual([["Squat", 2]]);
  });
  it("retire les drops vides mais garde les séries vides", () => {
    const out = cleanExercises([{ name: "Curl", supersetGroup: null, sets: [{ ...EMPTY_SET, reps: "10" }, { ...EMPTY_SET, isDrop: true }, { ...EMPTY_SET }] }]);
    expect(out[0].sets.map((s) => [s.reps, s.isDrop])).toEqual([["10", false], ["", false]]);
  });
});
