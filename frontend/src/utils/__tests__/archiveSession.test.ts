import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fc from "fast-check";
import { archiveSession } from "../sessionArchive";
import type { Drink, Beer, UserProfile } from "../../types/drinks";

// localStorage mock
beforeEach(() => {
  vi.stubGlobal("localStorage", {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  });
});

const BEER: Beer = { id: "b1", name: "Test Lager", abv: 4.5 };
const PROFILE: UserProfile = {
  weight: 80,
  sex: "male",
  optInHistory: false,
};
const T0 = 1_700_000_000_000;

function drink(offsetMs = 0): Drink {
  return {
    id: `d-${offsetMs}`,
    beerId: "b1",
    size: "pot",
    timestamp: T0 + offsetMs,
  };
}

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("archiveSession — bacCurve", () => {
  it("includes bacCurve in the returned archive", () => {
    const result = archiveSession(
      [drink(0), drink(3_600_000)],
      [BEER],
      PROFILE,
    );
    expect(result.bacCurve).toBeDefined();
    expect(Array.isArray(result.bacCurve)).toBe(true);
  });

  it("bacCurve is non-empty for valid drinks + profile", () => {
    const result = archiveSession(
      [drink(0), drink(3_600_000)],
      [BEER],
      PROFILE,
    );
    expect(result.bacCurve!.length).toBeGreaterThan(0);
  });

  it("bacCurve is [] when profile is null", () => {
    const result = archiveSession([drink(0)], [BEER], null);
    expect(result.bacCurve).toEqual([]);
  });

  it("last bacCurve snapshot timestamp equals endTimestamp", () => {
    const result = archiveSession(
      [drink(0), drink(3_600_000)],
      [BEER],
      PROFILE,
    );
    const curve = result.bacCurve!;
    expect(curve[curve.length - 1].timestamp).toBe(result.endTimestamp);
  });

  it("all bacCurve bac values are non-negative", () => {
    const result = archiveSession(
      [drink(0), drink(1_800_000)],
      [BEER],
      PROFILE,
    );
    result.bacCurve!.forEach((s) => expect(s.bac).toBeGreaterThanOrEqual(0));
  });
});

// ── Property test ─────────────────────────────────────────────────────────────

const NUM_RUNS = 25;

// Feature: bac-graph, Property 7: Archive always contains a bacCurve field
describe("Property 7 — archiveSession always stores bacCurve", () => {
  it("bacCurve is a non-empty BACSnapshot array for any valid drinks + profile", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            beerId: fc.constant("b1"),
            size: fc.constant("pot" as const),
            timestamp: fc.integer({ min: T0, max: T0 + 7_200_000 }),
          }),
          { minLength: 1, maxLength: 4 },
        ),
        (drinks) => {
          const result = archiveSession(drinks, [BEER], PROFILE);
          expect(result.bacCurve).toBeDefined();
          expect(Array.isArray(result.bacCurve)).toBe(true);
          expect(result.bacCurve!.length).toBeGreaterThan(0);
          result.bacCurve!.forEach((s) => {
            expect(typeof s.timestamp).toBe("number");
            expect(typeof s.bac).toBe("number");
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
