import { describe, it, expect } from "vitest";
import {
  calcStandardDrinks,
  getStandardDrinks,
  calculateBAC,
  calculateTimeUntilSober,
} from "../calculations";
import type { Drink, Beer, UserProfile } from "../../types/drinks";

const MALE_PROFILE: UserProfile = {
  sex: "male",
  weight: 80,
  height: 175,
  age: 35,
  optInHistory: false,
  profileSetup: true,
};

const FEMALE_PROFILE: UserProfile = {
  sex: "female",
  weight: 65,
  height: 165,
  age: 30,
  optInHistory: false,
  profileSetup: true,
};

const BEER: Beer = { id: "b1", name: "Test Lager", abv: 4.5 };
const T0 = 1_700_000_000_000;

function drink(offsetMs = 0): Drink {
  return { id: "d1", beerId: "b1", size: "pot", timestamp: T0 + offsetMs };
}

const gramsAlcohol = (d: Drink) => getStandardDrinks(d, BEER) * 10;

// ── calcStandardDrinks ────────────────────────────────────────────────────────

describe("calcStandardDrinks", () => {
  it("matches the Australian standard drink formula", () => {
    // (285 * 0.045 * 0.789) / 10
    expect(calcStandardDrinks(285, 4.5)).toBeCloseTo(1.012, 2);
  });

  it("returns 0 for 0% ABV", () => {
    expect(calcStandardDrinks(375, 0)).toBe(0);
  });

  it("scales linearly with volume", () => {
    const half = calcStandardDrinks(142.5, 4.5);
    const full = calcStandardDrinks(285, 4.5);
    expect(full).toBeCloseTo(half * 2, 10);
  });

  it("scales linearly with ABV", () => {
    const low = calcStandardDrinks(285, 4.5);
    const high = calcStandardDrinks(285, 9.0);
    expect(high).toBeCloseTo(low * 2, 10);
  });
});

// ── calculateBAC ─────────────────────────────────────────────────────────────

describe("calculateBAC", () => {
  it("returns 0 for empty drinks", () => {
    expect(calculateBAC([], MALE_PROFILE, T0, gramsAlcohol)).toBe(0);
  });

  it("returns 0 for null profile", () => {
    expect(calculateBAC([drink()], null, T0, gramsAlcohol)).toBe(0);
  });

  it("returns a positive BAC immediately after a drink", () => {
    const bac = calculateBAC([drink()], MALE_PROFILE, T0, gramsAlcohol);
    expect(bac).toBeGreaterThan(0);
  });

  it("BAC decreases over time", () => {
    const early = calculateBAC(
      [drink()],
      MALE_PROFILE,
      T0 + 3_600_000,
      gramsAlcohol,
    );
    const later = calculateBAC(
      [drink()],
      MALE_PROFILE,
      T0 + 7_200_000,
      gramsAlcohol,
    );
    expect(later).toBeLessThan(early);
  });

  it("BAC is never negative", () => {
    const bac = calculateBAC(
      [drink()],
      MALE_PROFILE,
      T0 + 86_400_000,
      gramsAlcohol,
    );
    expect(bac).toBe(0);
  });

  it("female BAC is higher than male for same drink (lower TBW)", () => {
    const male = calculateBAC([drink()], MALE_PROFILE, T0, gramsAlcohol);
    const female = calculateBAC([drink()], FEMALE_PROFILE, T0, gramsAlcohol);
    expect(female).toBeGreaterThan(male);
  });

  it("BAC increases with more drinks", () => {
    const one = calculateBAC([drink()], MALE_PROFILE, T0, gramsAlcohol);
    const two = calculateBAC(
      [drink(), drink(1000)],
      MALE_PROFILE,
      T0 + 1000,
      gramsAlcohol,
    );
    expect(two).toBeGreaterThan(one);
  });
});

// ── calculateTimeUntilSober ───────────────────────────────────────────────────

describe("calculateTimeUntilSober", () => {
  it("returns canDrive=true when BAC is 0", () => {
    const result = calculateTimeUntilSober([], MALE_PROFILE, T0, gramsAlcohol);
    expect(result.canDrive).toBe(true);
    expect(result.hoursUntilSober).toBe(0);
  });

  it("returns canDrive=true when BAC is at or below 0.05", () => {
    // Use a very old drink so BAC has decayed to near zero
    const result = calculateTimeUntilSober(
      [drink()],
      MALE_PROFILE,
      T0 + 10 * 3_600_000,
      gramsAlcohol,
    );
    expect(result.canDrive).toBe(true);
  });

  it("returns canDrive=false and a future soberTime when over limit", () => {
    // 6 pints at 4.5% ABV gives enough BAC to be well over 0.05 for an 80kg male
    const heavyDrinks = Array.from({ length: 6 }, (_, i) => ({
      id: `d${i}`,
      beerId: "b1",
      size: "pint" as const,
      timestamp: T0 + i * 600_000,
    }));
    const result = calculateTimeUntilSober(
      heavyDrinks,
      MALE_PROFILE,
      T0 + 5 * 600_000,
      gramsAlcohol,
    );
    expect(result.canDrive).toBe(false);
    expect(result.hoursUntilSober).toBeGreaterThan(0);
    expect(result.soberTime).toBeInstanceOf(Date);
    expect(result.soberTime!.getTime()).toBeGreaterThan(T0 + 5 * 600_000);
  });

  it("hoursUntilSober decreases as time passes", () => {
    const drinks = [drink(), drink(600_000), drink(1_200_000)];
    const r1 = calculateTimeUntilSober(
      drinks,
      MALE_PROFILE,
      T0 + 1_200_000,
      gramsAlcohol,
    );
    const r2 = calculateTimeUntilSober(
      drinks,
      MALE_PROFILE,
      T0 + 3_600_000,
      gramsAlcohol,
    );
    if (!r1.canDrive && !r2.canDrive) {
      expect(r2.hoursUntilSober).toBeLessThan(r1.hoursUntilSober);
    }
  });
});
