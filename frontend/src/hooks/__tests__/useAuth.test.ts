import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAuth } from "../useAuth";
import { useAuthStore } from "../../store/authStore";
import { API_ROUTES, STORAGE_KEYS } from "../../lib/constants";

function signedInWithLocalData() {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEYS.SIGNED_IN_USER, JSON.stringify({ id: "alice" }));
  localStorage.setItem(STORAGE_KEYS.PROFILE, "{}");
  localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, "[1]");
  localStorage.setItem(STORAGE_KEYS.SESSION, "drinks");
  useAuthStore.setState({ user: { id: "alice" }, loading: false });
}

function expectStillSignedIn() {
  expect(useAuthStore.getState().user).toEqual({ id: "alice" });
  expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).not.toBeNull();
  expect(localStorage.getItem(STORAGE_KEYS.PROFILE)).toBe("{}");
  expect(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)).toBe("[1]");
}

beforeEach(() => {
  vi.restoreAllMocks();
  signedInWithLocalData();
});

// Property 11: sign-out clears the queue only when it succeeds.
describe("signOut", () => {
  it("removes the hint, profile and queue when the request succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    const { result } = renderHook(() => useAuth());

    await result.current.signOut();

    expect(fetch).toHaveBeenCalledWith(API_ROUTES.SIGN_OUT, { method: "POST" });
    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.PROFILE)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBe("drinks");
  });

  it("changes nothing when the server fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 500 })),
    );
    const { result } = renderHook(() => useAuth());

    await expect(result.current.signOut()).rejects.toThrow();

    expectStillSignedIn();
  });

  it("changes nothing when the network fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const { result } = renderHook(() => useAuth());

    await expect(result.current.signOut()).rejects.toThrow();

    expectStillSignedIn();
  });
});
