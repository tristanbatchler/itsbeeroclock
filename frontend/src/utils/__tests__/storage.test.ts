import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUserProfile,
  saveUserProfile,
  getCachedBeers,
  saveBeers,
  getCustomBeers,
  saveCustomBeer,
  getFavouriteIds,
  toggleFavourite,
} from "../storage";
import type { UserProfile, Beer } from "../../types/drinks";

const VALID_PROFILE: UserProfile = {
  sex: "male",
  weight: 80,
  height: 175,
  age: 35,
  optInHistory: true,
  profileSetup: true,
};

// Use a real localStorage-like store backed by a Map
function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
});

// ── getUserProfile ────────────────────────────────────────────────────────────

describe("getUserProfile", () => {
  it("returns null when nothing is stored", () => {
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when profileSetup is false", () => {
    saveUserProfile({ ...VALID_PROFILE, profileSetup: false });
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when profileSetup is missing", () => {
    localStorage.setItem(
      "beeroclock_profile",
      JSON.stringify({
        sex: "male",
        weight: 80,
        height: 175,
        age: 35,
        optInHistory: true,
      }),
    );
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when sex is invalid", () => {
    localStorage.setItem(
      "beeroclock_profile",
      JSON.stringify({ ...VALID_PROFILE, sex: "other" }),
    );
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when weight is not a number", () => {
    localStorage.setItem(
      "beeroclock_profile",
      JSON.stringify({ ...VALID_PROFILE, weight: "80" }),
    );
    expect(getUserProfile()).toBeNull();
  });

  it("returns null when stored JSON is malformed", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("beeroclock_profile", "not-json{{{");
    expect(getUserProfile()).toBeNull();
    spy.mockRestore();
  });

  it("returns the profile when valid and profileSetup is true", () => {
    saveUserProfile(VALID_PROFILE);
    expect(getUserProfile()).toEqual(VALID_PROFILE);
  });

  it("round-trips a female profile correctly", () => {
    const female: UserProfile = { ...VALID_PROFILE, sex: "female", weight: 65 };
    saveUserProfile(female);
    expect(getUserProfile()).toEqual(female);
  });
});

// ── beers cache ───────────────────────────────────────────────────────────────

describe("getCachedBeers / saveBeers", () => {
  const BEERS: Beer[] = [
    { id: "b1", name: "Lager", abv: 4.5 },
    { id: "b2", name: "IPA", abv: 6.2 },
  ];

  it("returns [] when nothing is stored", () => {
    expect(getCachedBeers()).toEqual([]);
  });

  it("round-trips beers correctly", () => {
    saveBeers(BEERS);
    expect(getCachedBeers()).toEqual(BEERS);
  });

  it("returns [] when stored JSON is malformed", () => {
    localStorage.setItem("beeroclock_beers", "{{bad");
    expect(getCachedBeers()).toEqual([]);
  });
});

// ── custom beers ──────────────────────────────────────────────────────────────

describe("getCustomBeers / saveCustomBeer", () => {
  it("returns [] when nothing is stored", () => {
    expect(getCustomBeers()).toEqual([]);
  });

  it("adds a new custom beer", () => {
    const beer: Beer = { id: "c1", name: "My Brew", abv: 5.0, isCustom: true };
    saveCustomBeer(beer);
    expect(getCustomBeers()).toEqual([beer]);
  });

  it("replaces an existing beer with the same id", () => {
    const v1: Beer = { id: "c1", name: "My Brew", abv: 5.0, isCustom: true };
    const v2: Beer = { id: "c1", name: "My Brew v2", abv: 5.5, isCustom: true };
    saveCustomBeer(v1);
    saveCustomBeer(v2);
    const result = getCustomBeers();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(v2);
  });
});

// ── favourites ────────────────────────────────────────────────────────────────

describe("getFavouriteIds / toggleFavourite", () => {
  it("returns [] when nothing is stored", () => {
    expect(getFavouriteIds()).toEqual([]);
  });

  it("adds a beer id on first toggle", () => {
    toggleFavourite("b1");
    expect(getFavouriteIds()).toContain("b1");
  });

  it("removes a beer id on second toggle", () => {
    toggleFavourite("b1");
    toggleFavourite("b1");
    expect(getFavouriteIds()).not.toContain("b1");
  });

  it("toggling multiple beers accumulates correctly", () => {
    toggleFavourite("b1");
    toggleFavourite("b2");
    toggleFavourite("b1"); // remove b1
    expect(getFavouriteIds()).toEqual(["b2"]);
  });
});
