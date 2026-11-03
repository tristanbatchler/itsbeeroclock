import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useSessionCheckIns } from "../useSessionCheckIns";

describe("useSessionCheckIns", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("keeps clearCheckIns stable across renders and state changes", () => {
    const { result, rerender } = renderHook(() => useSessionCheckIns());
    const first = result.current.clearCheckIns;

    rerender();
    expect(result.current.clearCheckIns).toBe(first);

    act(() => result.current.setCheckInTriggered(true));
    expect(result.current.clearCheckIns).toBe(first);
  });

  it("clears the triggered flag", () => {
    const { result } = renderHook(() => useSessionCheckIns());

    act(() => result.current.setCheckInTriggered(true));
    expect(result.current.checkInTriggered).toBe(true);

    act(() => result.current.clearCheckIns());
    expect(result.current.checkInTriggered).toBe(false);
    expect(result.current.checkIns).toEqual([]);
  });
});
