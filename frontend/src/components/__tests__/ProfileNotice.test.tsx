import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ProfileNotice } from "../ProfileNotice";
import { STORAGE_KEYS } from "../../lib/constants";

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", makeLocalStorage());
});

function renderNotice(variant: "unauthenticated" | "incomplete") {
  return render(
    <MemoryRouter>
      <ProfileNotice variant={variant} />
    </MemoryRouter>,
  );
}

// ── unauthenticated variant ───────────────────────────────────────────────────

describe("ProfileNotice — unauthenticated", () => {
  it("renders when not dismissed", () => {
    renderNotice("unauthenticated");
    expect(screen.getByText(/get the full experience/i)).toBeInTheDocument();
  });

  it("does not render when already dismissed", () => {
    localStorage.setItem(STORAGE_KEYS.UNAUTH_DISMISSED, "1");
    renderNotice("unauthenticated");
    expect(screen.queryByText(/get the full experience/i)).not.toBeInTheDocument();
  });

  it("hides after clicking dismiss and writes to localStorage", async () => {
    renderNotice("unauthenticated");
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByText(/get the full experience/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.UNAUTH_DISMISSED)).toBe("1");
  });
});

// ── incomplete variant ────────────────────────────────────────────────────────

describe("ProfileNotice — incomplete", () => {
  it("renders when not dismissed", () => {
    renderNotice("incomplete");
    expect(screen.getByText(/set up your profile/i)).toBeInTheDocument();
  });

  it("does not render when already dismissed", () => {
    localStorage.setItem(STORAGE_KEYS.PROFILE_NOTICE_DISMISSED, "1");
    renderNotice("incomplete");
    expect(screen.queryByText(/set up your profile/i)).not.toBeInTheDocument();
  });

  it("hides after clicking dismiss and writes to localStorage", async () => {
    renderNotice("incomplete");
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(screen.queryByText(/set up your profile/i)).not.toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEYS.PROFILE_NOTICE_DISMISSED)).toBe("1");
  });

  it("has a link to /profile", () => {
    renderNotice("incomplete");
    const link = screen.getByRole("link", { name: /set up profile/i });
    expect(link).toHaveAttribute("href", "/profile");
  });
});
