import { describe, it, expect, vi, afterEach } from "vitest";
import { formatRelativeTime, formatHours } from "../time";

const NOW = 1_700_000_000_000;

afterEach(() => vi.useRealTimers());

// ── formatRelativeTime ────────────────────────────────────────────────────────

describe("formatRelativeTime", () => {
  it("returns 'just now' for < 60 seconds ago", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(NOW - 30_000)).toBe("just now");
    expect(formatRelativeTime(NOW - 59_000)).toBe("just now");
  });

  it("returns minutes for 1–59 minutes ago", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(NOW - 60_000)).toBe("1m ago");
    expect(formatRelativeTime(NOW - 3_540_000)).toBe("59m ago");
  });

  it("returns hours for 1–23 hours ago", () => {
    vi.setSystemTime(NOW);
    expect(formatRelativeTime(NOW - 3_600_000)).toBe("1h ago");
    expect(formatRelativeTime(NOW - 82_800_000)).toBe("23h ago");
  });

  it("returns a time string for >= 24 hours ago", () => {
    vi.setSystemTime(NOW);
    const result = formatRelativeTime(NOW - 86_400_000);
    // Should be a formatted time like "12:00 AM" — just check it's not a relative string
    expect(result).not.toMatch(/ago|just now/);
  });
});

// ── formatHours ───────────────────────────────────────────────────────────────

describe("formatHours", () => {
  it("returns minutes only for < 1 hour", () => {
    expect(formatHours(0.5)).toBe("30m");
    expect(formatHours(0.25)).toBe("15m");
  });

  it("rounds up partial minutes", () => {
    expect(formatHours(0.1)).toBe("6m"); // 0.1 * 60 = 6
  });

  it("returns whole hours when no remainder", () => {
    expect(formatHours(1)).toBe("1h");
    expect(formatHours(3)).toBe("3h");
  });

  it("returns hours and minutes when there is a remainder", () => {
    expect(formatHours(1.5)).toBe("1h 30m");
    expect(formatHours(2.25)).toBe("2h 15m");
  });
});
