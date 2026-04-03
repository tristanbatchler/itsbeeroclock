import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  computeBACCurve,
  calculateBAC,
  getStandardDrinks,
} from "../calculations";
import type { Drink, Beer, UserProfile } from "../../types/drinks";

const BEER: Beer = { id: "b1", name: "Test Lager", abv: 4.5 };
const PROFILE: UserProfile = {
  weight: 80,
  height: 175,
  age: 35,
  sex: "male",
  optInHistory: false,
  profileSetup: true,
};
const T0 = 1_700_000_000_000;

function drink(offsetMs = 0): Drink {
  return { id: "d1", beerId: "b1", size: "pot", timestamp: T0 + offsetMs };
}

function gramsAlcohol(allBeers: Beer[]) {
  return (d: Drink) => {
    const beer = allBeers.find((b) => b.id === d.beerId);
    return beer ? getStandardDrinks(d, beer) * 10 : 0;
  };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("computeBACCurve — unit tests", () => {
  it("returns [] for empty drinks", () => {
    expect(computeBACCurve([], [BEER], PROFILE, T0, T0 + 3_600_000)).toEqual(
      [],
    );
  });

  it("returns [] for null profile", () => {
    expect(
      computeBACCurve([drink()], [BEER], null, T0, T0 + 3_600_000),
    ).toEqual([]);
  });

  it("returns [] when endTime < startTime", () => {
    expect(computeBACCurve([drink()], [BEER], PROFILE, T0 + 1000, T0)).toEqual(
      [],
    );
  });

  it("returns single snapshot when startTime === endTime", () => {
    const result = computeBACCurve([drink()], [BEER], PROFILE, T0, T0);
    expect(result).toHaveLength(1);
    expect(result[0].timestamp).toBe(T0);
  });

  it("last snapshot timestamp equals endTime", () => {
    const endTime = T0 + 3_700_000; // not a multiple of intervalMs
    const result = computeBACCurve([drink()], [BEER], PROFILE, T0, endTime);
    expect(result[result.length - 1].timestamp).toBe(endTime);
  });

  it("snapshots are ordered by timestamp", () => {
    const result = computeBACCurve(
      [drink()],
      [BEER],
      PROFILE,
      T0,
      T0 + 1_200_000,
    );
    for (let i = 1; i < result.length; i++) {
      expect(result[i].timestamp).toBeGreaterThan(result[i - 1].timestamp);
    }
  });

  it("bac values are non-negative", () => {
    const result = computeBACCurve(
      [drink()],
      [BEER],
      PROFILE,
      T0,
      T0 + 7_200_000,
    );
    result.forEach((s) => expect(s.bac).toBeGreaterThanOrEqual(0));
  });
});

// ── Property tests ────────────────────────────────────────────────────────────

const NUM_RUNS = 25;

// Property 1: Curve covers the full time range at the specified interval
// Feature: bac-graph, Property 1: Curve covers the full time range at the specified interval
describe("Property 1 — curve covers full time range", () => {
  it("snapshots start ≤ startTime+intervalMs, are spaced intervalMs apart, last === endTime", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }).chain((n) =>
          fc.tuple(
            fc.constant(n),
            fc.array(
              fc.record({
                id: fc.uuid(),
                beerId: fc.constant("b1"),
                size: fc.constant("pot" as const),
                timestamp: fc.integer({ min: T0, max: T0 + 3_600_000 }),
              }),
              { minLength: 1, maxLength: 3 },
            ),
            fc.integer({ min: 60_000, max: 600_000 }), // intervalMs
          ),
        ),
        ([, drinks, intervalMs]) => {
          const startTime = Math.min(...drinks.map((d) => d.timestamp));
          const endTime = startTime + intervalMs * 3 + 17_000; // not a clean multiple
          const result = computeBACCurve(
            drinks,
            [BEER],
            PROFILE,
            startTime,
            endTime,
            intervalMs,
          );

          if (result.length === 0) return true; // guard

          expect(result[0].timestamp).toBeLessThanOrEqual(
            startTime + intervalMs,
          );
          expect(result[result.length - 1].timestamp).toBe(endTime);

          for (let i = 1; i < result.length - 1; i++) {
            expect(result[i].timestamp - result[i - 1].timestamp).toBe(
              intervalMs,
            );
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// Property 2: Curve values are consistent with calculateBAC
// Feature: bac-graph, Property 2: Curve values are consistent with calculateBAC
describe("Property 2 — BAC values match calculateBAC", () => {
  it("each snapshot bac equals calculateBAC at that timestamp", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            beerId: fc.constant("b1"),
            size: fc.constant("pot" as const),
            timestamp: fc.integer({ min: T0, max: T0 + 3_600_000 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        (drinks) => {
          const startTime = Math.min(...drinks.map((d) => d.timestamp));
          const endTime = startTime + 900_000;
          const result = computeBACCurve(
            drinks,
            [BEER],
            PROFILE,
            startTime,
            endTime,
            300_000,
          );

          result.forEach((snap) => {
            const drinksAtSnap = drinks.filter(
              (d) => d.timestamp <= snap.timestamp,
            );
            const expected = calculateBAC(
              drinksAtSnap,
              PROFILE,
              snap.timestamp,
              gramsAlcohol([BEER]),
            );
            expect(snap.bac).toBeCloseTo(expected, 10);
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});

// Property 3: Null profile produces empty curve
// Feature: bac-graph, Property 3: Null profile produces empty curve
describe("Property 3 — null profile returns []", () => {
  it("always returns [] when profile is null", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            beerId: fc.constant("b1"),
            size: fc.constant("pot" as const),
            timestamp: fc.integer({ min: T0, max: T0 + 3_600_000 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        fc.integer({ min: T0, max: T0 + 1_000_000 }),
        fc.integer({ min: T0 + 1_000_001, max: T0 + 7_200_000 }),
        (drinks, startTime, endTime) => {
          expect(
            computeBACCurve(drinks, [BEER], null, startTime, endTime),
          ).toEqual([]);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
