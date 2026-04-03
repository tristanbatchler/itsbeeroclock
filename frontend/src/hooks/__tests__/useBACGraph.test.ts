import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import * as fc from "fast-check";
import { useBACGraph } from "../useBACGraph";
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
  return {
    id: `d-${offsetMs}`,
    beerId: "b1",
    size: "pot",
    timestamp: T0 + offsetMs,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0 + 3_600_000);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Unit tests ────────────────────────────────────────────────────────────────

describe("useBACGraph — unit tests", () => {
  it("returns empty snapshots when drinks is empty", () => {
    const { result } = renderHook(() => useBACGraph([], [BEER], PROFILE));
    expect(result.current.snapshots).toEqual([]);
  });

  it("returns empty snapshots when profile is null", () => {
    const { result } = renderHook(() => useBACGraph([drink(0)], [BEER], null));
    expect(result.current.snapshots).toEqual([]);
  });

  it("sets interval of 300 000 ms", () => {
    const setSpy = vi.spyOn(globalThis, "setInterval");
    renderHook(() => useBACGraph([drink(0)], [BEER], PROFILE));
    expect(setSpy).toHaveBeenCalledWith(expect.any(Function), 300_000);
    setSpy.mockRestore();
  });

  it("endTime updates after interval tick", () => {
    const { result } = renderHook(() =>
      useBACGraph([drink(0)], [BEER], PROFILE),
    );
    const before = result.current.endTime;
    act(() => {
      vi.advanceTimersByTime(300_000);
    });
    expect(result.current.endTime).toBeGreaterThan(before);
  });

  it("startTime equals first drink timestamp", () => {
    const { result } = renderHook(() =>
      useBACGraph([drink(0), drink(1_800_000)], [BEER], PROFILE),
    );
    expect(result.current.startTime).toBe(T0);
  });
});

// ── Property test ─────────────────────────────────────────────────────────────

const NUM_RUNS = 25;

// Feature: bac-graph, Property 4: Drinks change triggers curve recompute
describe("Property 4 — adding a drink changes snapshots", () => {
  it("snapshots differ after adding a drink that contributes non-zero BAC", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }).chain((n) =>
          fc.array<Drink>(
            fc.record({
              id: fc.uuid(),
              beerId: fc.constant("b1"),
              size: fc.constant("pot" as const),
              timestamp: fc.integer({ min: T0, max: T0 + 1_800_000 }),
            }) as fc.Arbitrary<Drink>,
            { minLength: n, maxLength: n },
          ),
        ),
        (initialDrinks) => {
          const { result, rerender } = renderHook(
            ({ drinks }: { drinks: Drink[] }) =>
              useBACGraph(drinks, [BEER], PROFILE),
            { initialProps: { drinks: initialDrinks } },
          );

          const before = JSON.stringify(result.current.snapshots);

          const newDrink: Drink = {
            id: "extra",
            beerId: "b1",
            size: "pint",
            timestamp: T0 + 900_000,
          };
          rerender({ drinks: [...initialDrinks, newDrink] });

          const after = JSON.stringify(result.current.snapshots);
          expect(after).not.toBe(before);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
