import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFadeOut } from "../useFadeOut";

describe("useFadeOut", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (visible: boolean) =>
    renderHook(({ visible }) => useFadeOut(visible, 300), {
      initialProps: { visible },
    });

  it("starts unmounted when not visible", () => {
    const { result } = setup(false);
    expect(result.current).toEqual({ mounted: false, fadingOut: false });
  });

  it("mounts without fading when it becomes visible", () => {
    const { result, rerender } = setup(false);
    rerender({ visible: true });
    expect(result.current).toEqual({ mounted: true, fadingOut: false });
  });

  it("fades for the full duration, then unmounts", () => {
    const { result, rerender } = setup(true);
    rerender({ visible: false });
    expect(result.current).toEqual({ mounted: true, fadingOut: true });

    act(() => vi.advanceTimersByTime(299));
    expect(result.current).toEqual({ mounted: true, fadingOut: true });

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toEqual({ mounted: false, fadingOut: false });
  });

  it("cancels the fade if it becomes visible again", () => {
    const { result, rerender } = setup(true);
    rerender({ visible: false });
    act(() => vi.advanceTimersByTime(100));
    rerender({ visible: true });
    expect(result.current).toEqual({ mounted: true, fadingOut: false });

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toEqual({ mounted: true, fadingOut: false });
  });

  it("can fade out again after a cancelled fade", () => {
    const { result, rerender } = setup(true);
    rerender({ visible: false });
    rerender({ visible: true });
    rerender({ visible: false });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toEqual({ mounted: false, fadingOut: false });
  });
});
