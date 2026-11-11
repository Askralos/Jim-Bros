import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadCache, saveCache, clearCache } from "./cache";

describe("cache local", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
  });

  it("relit ce qui a été sauvegardé, avec le compte auquel ça appartient", () => {
    saveCache("u1", { sessions: [{ id: "s1" }] });
    expect(loadCache()).toEqual({ userId: "u1", data: { sessions: [{ id: "s1" }] } });
  });

  it("null si rien, si vidé, ou si le contenu est illisible", () => {
    expect(loadCache()).toBeNull();
    saveCache("u1", { sessions: [] });
    clearCache();
    expect(loadCache()).toBeNull();
    localStorage.setItem("jimbros.cache.v1", "{pas du json");
    expect(loadCache()).toBeNull();
  });

  it("ne plante pas si le stockage est indisponible (navigation privée, quota)", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("bloqué"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => { throw new Error("bloqué"); } });
    expect(() => saveCache("u1", {})).not.toThrow();
    expect(() => clearCache()).not.toThrow();
    expect(loadCache()).toBeNull();
  });
});

import { loadDraft, saveDraft, clearDraft } from "./drafts";

describe("brouillons", () => {
  beforeEach(() => {
    const store = new Map();
    vi.stubGlobal("localStorage", {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    });
  });

  it("sauvegarde, relit, efface", () => {
    saveDraft("new.u1", { title: "Push" });
    expect(loadDraft("new.u1")).toEqual({ title: "Push" });
    clearDraft("new.u1");
    expect(loadDraft("new.u1")).toBeNull();
  });

  it("un brouillon de plus de 3 jours est ignoré", () => {
    localStorage.setItem("jimbros.draft.old", JSON.stringify({ savedAt: Date.now() - 4 * 86400000, data: { title: "x" } }));
    expect(loadDraft("old")).toBeNull();
  });
});
