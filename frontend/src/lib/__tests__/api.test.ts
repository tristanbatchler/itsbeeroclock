import { beforeEach, describe, expect, it, vi } from "vitest";
import fc from "fast-check";
import { api, processOfflineQueue, UnauthorizedError, type QueuedRequest } from "../api";
import { useAuthStore } from "../../store/authStore";
import { STORAGE_KEYS } from "../constants";

function queued(count: number): QueuedRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `req-${i}`,
    endpoint: `/api/drinks?n=${i}`,
    method: "POST",
    body: "{}",
  }));
}

function storedQueue(): QueuedRequest[] {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE) ?? "[]");
}

/** Answers each request in order with the given statuses. */
function mockStatuses(statuses: number[]) {
  const fetchMock = vi.fn();
  statuses.forEach((status) =>
    fetchMock.mockResolvedValueOnce(new Response("{}", { status })),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function signIn() {
  localStorage.clear();
  useAuthStore.setState({ user: { id: "alice" }, loading: false });
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  signIn();
});

// Property 10: an expired session doesn't lose queued drinks.
describe("processOfflineQueue", () => {
  it("keeps every request that hasn't succeeded when the server returns 401", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }).chain((length) =>
          fc.record({
            length: fc.constant(length),
            failAt: fc.integer({ min: 0, max: length - 1 }),
          }),
        ),
        async ({ length, failAt }) => {
          signIn();
          const queue = queued(length);
          localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
          const fetchMock = mockStatuses([...Array(failAt).fill(200), 401]);

          await processOfflineQueue();

          expect(storedQueue()).toEqual(queue.slice(failAt));
          // It stops at the 401 rather than trying the rest.
          expect(fetchMock).toHaveBeenCalledTimes(failAt + 1);
          expect(useAuthStore.getState().user).toBeNull();
        },
      ),
      { numRuns: 30 },
    );
  });

  it("drops only the request that gets another 4xx", async () => {
    const queue = queued(3);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    mockStatuses([200, 400, 200]);

    await processOfflineQueue();

    expect(storedQueue()).toEqual([]);
    expect(useAuthStore.getState().user).toEqual({ id: "alice" });
  });

  it("keeps a 4xx drop separate from a later 401", async () => {
    const queue = queued(3);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    mockStatuses([400, 401]);

    await processOfflineQueue();

    expect(storedQueue()).toEqual(queue.slice(1));
  });

  it("keeps requests that fail because of the network", async () => {
    const queue = queued(2);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    await processOfflineQueue();

    expect(storedQueue()).toEqual(queue);
  });

  it("does nothing while signed out", async () => {
    useAuthStore.setState({ user: null });
    const queue = queued(2);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    const fetchMock = mockStatuses([]);

    await processOfflineQueue();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(storedQueue()).toEqual(queue);
  });

  it("keeps the rest if the session ends mid-flush", async () => {
    const queue = queued(2);
    localStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    const fetchMock = vi.fn().mockImplementationOnce(async () => {
      useAuthStore.getState().setSignedOut();
      return new Response("{}");
    });
    vi.stubGlobal("fetch", fetchMock);

    await processOfflineQueue();

    expect(storedQueue()).toEqual(queue.slice(1));
  });
});

describe("requests", () => {
  it("never sends an Authorization header", async () => {
    const fetchMock = mockStatuses([200]);

    await api.getProfile();

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(Object.keys(headers).map((h) => h.toLowerCase())).not.toContain(
      "authorization",
    );
  });

  it("signs out and throws UnauthorizedError on a 401", async () => {
    mockStatuses([401]);

    await expect(api.getProfile()).rejects.toBeInstanceOf(UnauthorizedError);

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("stays signed out if another 401 arrives afterwards", async () => {
    mockStatuses([401, 401]);
    const [first, second] = [api.getProfile(), api.getDrinks()];

    await expect(first).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(second).rejects.toBeInstanceOf(UnauthorizedError);

    expect(useAuthStore.getState().user).toBeNull();
  });

  it("throws without calling the server when signed out", async () => {
    useAuthStore.setState({ user: null });
    const fetchMock = mockStatuses([]);

    await expect(api.getDrinks()).rejects.toBeInstanceOf(UnauthorizedError);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("doesn't queue a 401 mutation", async () => {
    mockStatuses([401]);

    await expect(api.syncDrinks([])).rejects.toBeInstanceOf(UnauthorizedError);

    expect(storedQueue()).toEqual([]);
  });

  it("never queues a purge, so it can't run later after reporting failure", async () => {
    mockStatuses([500]);
    await expect(api.clearUserData()).rejects.toThrow();
    expect(storedQueue()).toEqual([]);

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(api.clearUserData()).rejects.toThrow();
    expect(storedQueue()).toEqual([]);
  });
});
