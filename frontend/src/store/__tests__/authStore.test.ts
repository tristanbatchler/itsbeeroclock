import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { useAuthStore } from "../authStore";
import { API_ROUTES, STORAGE_KEYS } from "../../lib/constants";

function mockSessionResponse(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

function storeHint(id: string) {
  localStorage.setItem(STORAGE_KEYS.SIGNED_IN_USER, JSON.stringify({ id }));
}

function reset(user: { id: string } | null = null) {
  localStorage.clear();
  if (user) storeHint(user.id);
  useAuthStore.setState({ user, loading: true });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  reset();
});

describe("initAuth", () => {
  it("stores the user and hint when the session is valid", async () => {
    mockSessionResponse(200, { user: { id: "alice" } });

    await useAuthStore.getState().initAuth();

    expect(fetch).toHaveBeenCalledWith(API_ROUTES.AUTH_SESSION);
    expect(useAuthStore.getState().user).toEqual({ id: "alice" });
    expect(useAuthStore.getState().loading).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).toContain("alice");
  });

  // Property 12: only a 200 with null or a 401 signs the user out.
  it.each([
    ["200 with null", 200, { user: null }],
    ["401", 401, { error: "not signed in" }],
  ])("clears the user and hint on %s", async (_name, status, body) => {
    reset({ id: "alice" });
    mockSessionResponse(status, body);

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).toBeNull();
  });

  it("keeps the hint for any 5xx", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 500, max: 599 }), async (status) => {
        reset({ id: "alice" });
        mockSessionResponse(status, {});

        await useAuthStore.getState().initAuth();

        expect(useAuthStore.getState().user).toEqual({ id: "alice" });
        expect(useAuthStore.getState().loading).toBe(false);
        expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).not.toBeNull();
      }),
      { numRuns: 20 },
    );
  });

  it("keeps the hint on a network error", async () => {
    reset({ id: "alice" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toEqual({ id: "alice" });
    expect(useAuthStore.getState().loading).toBe(false);
  });

  // CloudFront answers some /api/* errors with index.html and a 200.
  it("keeps the hint when a 200 isn't the expected JSON", async () => {
    reset({ id: "alice" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 200 })),
    );

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toEqual({ id: "alice" });
  });

  it("loads the hint before the check finishes", async () => {
    localStorage.setItem(
      STORAGE_KEYS.SIGNED_IN_USER,
      JSON.stringify({ id: "alice" }),
    );
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));

    useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toEqual({ id: "alice" });
    expect(useAuthStore.getState().loading).toBe(false);
  });

  // Property 12: `user` is an effect dependency, so it must not change identity.
  it("keeps the same user object across checks with the same ID", async () => {
    reset({ id: "alice" });
    const before = useAuthStore.getState().user;
    mockSessionResponse(200, { user: { id: "alice" } });

    await useAuthStore.getState().initAuth();
    mockSessionResponse(200, { user: { id: "alice" } });
    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toBe(before);
  });

  it("replaces the user when the ID changes", async () => {
    reset({ id: "alice" });
    mockSessionResponse(200, { user: { id: "bob" } });

    await useAuthStore.getState().initAuth();

    expect(useAuthStore.getState().user).toEqual({ id: "bob" });
  });

  it("removes old Supabase sessions and nothing else", async () => {
    localStorage.setItem("sb-abc123-auth-token", "old");
    localStorage.setItem("sb-abc123-auth-token-code-verifier", "old");
    localStorage.setItem(STORAGE_KEYS.SESSION, "drinks");
    mockSessionResponse(200, { user: null });

    await useAuthStore.getState().initAuth();

    expect(localStorage.getItem("sb-abc123-auth-token")).toBeNull();
    expect(localStorage.getItem("sb-abc123-auth-token-code-verifier")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBe("drinks");
  });

  it("can't sign the user back in after a sign-out during the check", async () => {
    reset({ id: "alice" });
    let respond: (response: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise((resolve) => (respond = resolve))),
    );

    const check = useAuthStore.getState().initAuth();
    useAuthStore.getState().setSignedOut();
    respond(new Response(JSON.stringify({ user: { id: "alice" } })));
    await check;

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).toBeNull();
  });
});

describe("setSignedOut", () => {
  it("keeps the offline queue, drinks and profile", () => {
    reset({ id: "alice" });
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, "[1]");
    localStorage.setItem(STORAGE_KEYS.SESSION, "drinks");

    useAuthStore.getState().setSignedOut();

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SIGNED_IN_USER)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE)).toBe("[1]");
    expect(localStorage.getItem(STORAGE_KEYS.SESSION)).toBe("drinks");
  });
});
